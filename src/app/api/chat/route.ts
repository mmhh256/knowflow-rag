import type {
  ChatErrorResponse,
  ChatRequest,
  ChatResponse,
} from "@/lib/types/chat";
import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
import { prisma } from "@/lib/db";
import { answerQuestionWithRagPriority } from "@/lib/rag/answer-question";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ChatRequest>;
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

    // P10：普通接口走完整 Agentic RAG 图。
    // 这里仍然先生成回答，再保存当前 user 消息，原因是 P9 已经说明：
    // 历史消息应该只包含“当前问题之前”的内容，避免当前问题在 prompt 中重复出现两次。
    const agentResult = await answerQuestionWithRagPriority({
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

    const response: ChatResponse = {
      conversationId: conversation.id,
      answer: agentResult.answer,
      sources: agentResult.sources,
      answerMode: agentResult.answerMode,
      retrievalStatus: agentResult.retrievalStatus,
      fallbackReason: agentResult.fallbackReason,
      rewrittenQuestion: agentResult.rewrittenQuestion,
      judgeReason: agentResult.judgeReason,
    };

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: agentResult.answer,
        // assistant 消息继续保存 RAG 元信息，刷新历史会话后仍能看到回答依据。
        // rewrittenQuestion 和 judgeReason 暂不入库，P10 只把它们作为本次请求的调试信息返回前端。
        sources: agentResult.sources,
        answerMode: agentResult.answerMode,
        retrievalStatus: agentResult.retrievalStatus,
        fallbackReason: agentResult.fallbackReason,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return Response.json(response);
  } catch (error) {
    // 检索、改写、Judge 的异常会优先在 Agentic RAG 层 fallback；
    // 这里通常代表数据库或最终模型生成失败，需要返回真正的接口错误。
    console.error("Chat route failed:", error);
    const message =
      error instanceof Error ? error.message : "聊天接口处理失败";
    return jsonError(message, 500);
  }
}
