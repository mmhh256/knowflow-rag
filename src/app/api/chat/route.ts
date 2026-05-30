import type {
  ChatErrorResponse,
  ChatRequest,
  ChatResponse,
} from "@/lib/types/chat";
import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
import { prisma } from "@/lib/db";
import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import { prepareRagPriorityAnswer } from "@/lib/rag/prepare-answer";

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

    // P9 的关键顺序：
    // 1. 先用 conversationId 读取“当前问题之前”的历史消息并准备 prompt。
    // 2. 再保存当前 user 消息。
    // 这样当前问题只会作为 prompt 最后一条 user 消息出现一次，不会被历史消息重复带进去。
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

    const chatProvider = createOpenAICompatibleChatProvider();
    const answer = await chatProvider.generate(prepared.messages);

    const response: ChatResponse = {
      conversationId: conversation.id,
      answer,
      sources: prepared.sources,
      answerMode: prepared.answerMode,
      retrievalStatus: prepared.retrievalStatus,
      fallbackReason: prepared.fallbackReason,
    };

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: answer,
        // assistant 消息保存 sources 和检索状态，刷新历史会话后仍然能看到回答依据。
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

    return Response.json(response);
  } catch (error) {
    // 检索失败会在 RAG 层转为 fallback；这里通常代表数据库或外部 LLM 生成失败。
    console.error("Chat route failed:", error);
    const message = error instanceof Error ? error.message : "聊天接口处理失败";
    return jsonError(message, 500);
  }
}
