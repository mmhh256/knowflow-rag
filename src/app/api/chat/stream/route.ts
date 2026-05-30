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
  // SSE 事件格式固定为 event + data + 空行，浏览器前端会按空行切分每条事件。
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

  let clientAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event, data)));
      };

      try {
        // 流式接口和普通接口复用同一套 prepare 逻辑。
        // prepare 会在当前 user 消息保存前读取历史，避免当前问题重复进入 prompt。
        const prepared = await prepareRagPriorityAnswer({
          question,
          conversationId: conversation.id,
          userId: MOCK_USER_ID,
        });

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "user",
            content: question,
          },
        });

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

        for await (const token of chatProvider.stream(prepared.messages)) {
          if (clientAborted) {
            break;
          }

          answer += token;
          sendEvent("token", { content: token });
        }

        if (clientAborted) {
          // P8/P9 第一版停止生成时不保存半截 assistant 消息。
          // 前端会保留已显示内容；刷新后以数据库中已完整保存的历史为准。
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
      // 前端 AbortController.abort() 会触发 cancel，用于停止继续读取模型流。
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
