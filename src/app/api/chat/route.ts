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

    // 保存顺序：先保存 user 消息，再生成 assistant 回复。
    // 这样即使模型生成失败，数据库也能保留用户的问题，方便排查。
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: question,
      },
    });

    const result = await answerQuestionWithRagPriority({
      question,
      conversationId: conversation.id,
    });

    const response: ChatResponse = {
      conversationId: conversation.id,
      answer: result.answer,
      sources: result.sources,
      answerMode: result.answerMode,
      retrievalStatus: result.retrievalStatus,
      fallbackReason: result.fallbackReason,
    };

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: result.answer,
        // assistant 消息保存 sources，刷新历史会话后仍然能看到引用来源。
        sources: result.sources,
        answerMode: result.answerMode,
        retrievalStatus: result.retrievalStatus,
        // fallback 也保存 retrievalStatus / fallbackReason，用户能知道为什么没用知识库。
        fallbackReason: result.fallbackReason,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return Response.json(response);
  } catch (error) {
    // 检索异常已经在 RAG 层转为 fallback；这里出现错误通常是外部 LLM 生成失败或数据库异常。
    console.error("Chat route failed:", error);
    const message = error instanceof Error ? error.message : "聊天接口处理失败";
    return jsonError(message, 500);
  }
}
