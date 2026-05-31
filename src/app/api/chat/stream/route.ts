import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
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

async function getOrCreateConversation(params: {
  conversationId?: string;
  question: string;
  userId: string;
}) {
  if (!params.conversationId) {
    return prisma.conversation.create({
      data: {
        userId: params.userId,
        title: createConversationTitle(params.question),
      },
    });
  }

  return prisma.conversation.findFirst({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
  });
}

function encodeSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  let body: Partial<ChatStreamRequest> = {};

  try {
    body = (await req.json()) as Partial<ChatStreamRequest>;
  } catch {
    return jsonError("请求体解析失败。", 400);
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : undefined;

  if (!question) {
    return jsonError("问题不能为空。", 400);
  }

  let user: Awaited<ReturnType<typeof requireCurrentUser>>;
  let conversation: Awaited<ReturnType<typeof getOrCreateConversation>>;

  try {
    user = await requireCurrentUser();
    conversation = await getOrCreateConversation({
      conversationId,
      question,
      userId: user.id,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonError(error.message, 401);
    }

    const message = error instanceof Error ? error.message : "会话初始化失败";
    return jsonError(message, 500);
  }

  if (!conversation) {
    return jsonError("会话不存在。", 404);
  }

  let clientAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event, data)));
      };

      try {
        // Agentic RAG 先完成问题改写、检索、Judge 和 messages 准备；
        // 最终答案仍用 Provider.stream 输出，保留 P8 的 SSE 和停止生成能力。
        const prepared = await prepareRagPriorityAnswer({
          question,
          conversationId: conversation.id,
          userId: user.id,
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
          rewrittenQuestion: prepared.rewrittenQuestion,
          judgeReason: prepared.judgeReason,
        });

        const chatProvider = createOpenAICompatibleChatProvider();

        if (!chatProvider.stream) {
          throw new Error("当前模型 Provider 不支持流式输出。");
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
