import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { answerQuestionWithRagPriority } from "@/lib/rag/answer-question";
import type {
  ChatErrorResponse,
  ChatRequest,
  ChatResponse,
} from "@/lib/types/chat";

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

  // 会话必须属于当前登录用户，不能只按 conversationId 查询。
  return prisma.conversation.findFirst({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await req.json()) as Partial<ChatRequest>;
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId : undefined;

    if (!question) {
      return jsonError("问题不能为空。", 400);
    }

    const conversation = await getOrCreateConversation({
      conversationId,
      question,
      userId: user.id,
    });

    if (!conversation) {
      return jsonError("会话不存在。", 404);
    }

    // 先生成回答，再保存当前 user 消息：这样 P9/P10 查询历史时只会拿到“当前问题之前”的上下文，
    // 避免当前问题在 prompt 中重复出现两次。
    const agentResult = await answerQuestionWithRagPriority({
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
    if (isUnauthorizedError(error)) {
      return jsonError(error.message, 401);
    }

    console.error("Chat route failed:", error);
    const message =
      error instanceof Error ? error.message : "聊天接口处理失败";
    return jsonError(message, 500);
  }
}
