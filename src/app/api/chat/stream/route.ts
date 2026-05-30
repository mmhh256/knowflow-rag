import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
import { prisma } from "@/lib/db";
import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import { prepareRagPriorityAnswer } from "@/lib/rag/prepare-answer";
import type { ChatErrorResponse, ChatStreamRequest } from "@/lib/types/chat";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  const body: ChatErrorResponse = { error: message };
  return Response.json(body, { status });
}

function createConversationTitle(question: string) {
  return question.length > 20 ? `${question.slice(0, 20)}...` : question;
}

async function getOrCreateConversation(
  conversationId: string | undefined,
  question: string,
) {
  await ensureMockUser();

  if (!conversationId) {
    return prisma.conversation.create({
      data: {
        userId: MOCK_USER_ID,
        title: createConversationTitle(question),
      },
    });
  }

  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: MOCK_USER_ID,
    },
  });
}

function encodeSseEvent(event: string, data: unknown) {
  // SSE 格式固定为 "event: xxx\ndata: yyy\n\n"。
  // 空行是事件结束标记，浏览器才能正确分割每一条事件。
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  let body: Partial<ChatStreamRequest> = {};

  try {
    body = (await req.json()) as Partial<ChatStreamRequest>;
  } catch {
    return jsonError("请求体解析失败", 400);
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : undefined;

  if (!question) {
    return jsonError("问题不能为空", 400);
  }

  const conversation = await getOrCreateConversation(conversationId, question);

  if (!conversation) {
    return jsonError("会话不存在", 404);
  }

  // 保存顺序：先保存 user 消息，再生成 assistant 回复。
  // 这样即使模型生成失败，数据库也能保留用户的问题，方便排查。
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: question,
    },
  });

  let clientAborted = false;

  // ReadableStream 是浏览器/Node 统一的流式接口，
  // 我们用它把 token 逐段写给前端。
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event, data)));
      };

      try {
        const prepared = await prepareRagPriorityAnswer({ question });

        // meta 必须先发：前端要先知道本次是 RAG 还是 fallback，
        // 以及 sources / retrievalStatus 等信息，才能正确渲染占位消息。
        sendEvent("meta", {
          conversationId: conversation.id,
          answerMode: prepared.answerMode,
          retrievalStatus: prepared.retrievalStatus,
          fallbackReason: prepared.fallbackReason,
          sources: prepared.sources,
        });

        const chatProvider = createOpenAICompatibleChatProvider();

        if (!chatProvider.stream) {
          throw new Error("当前模型 Provider 不支持流式输出");
        }

        let answer = "";

        // AI 回答本身就是逐步生成的，所以非常适合用流式输出提前展示内容。
        // token 是模型流式输出的最小文本片段。
        // for await...of 可以逐段读取 AsyncIterable。
        for await (const token of chatProvider.stream(prepared.messages)) {
          if (clientAborted) {
            break;
          }

          answer += token;
          sendEvent("token", { content: token });
        }

        if (clientAborted) {
          // 浏览器中断连接时，后端不一定还能保存完整答案，
          // P8 第一版先允许前端保留已生成内容。
          return;
        }

        const assistantMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: answer,
            sources: prepared.sources,
            answerMode: prepared.answerMode,
            retrievalStatus: prepared.retrievalStatus,
            fallbackReason: prepared.fallbackReason,
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        sendEvent("done", {
          messageId: assistantMessage.id,
          answer,
        });
        controller.close();
      } catch (error) {
        if (clientAborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "聊天流式接口处理失败";
        sendEvent("error", { message });
        controller.close();
      }
    },
    cancel() {
      // 前端调用 AbortController.abort() 会触发 cancel。
      clientAborted = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
