import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import type {
  AnswerMode,
  ChatMessage,
  RetrievalStatus,
  SourceChunk,
} from "@/lib/types/chat";

function toMessageDto(message: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  sources: unknown;
  answerMode: string | null;
  retrievalStatus: string | null;
  fallbackReason: string | null;
  createdAt: Date;
}): ChatMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
    sources: Array.isArray(message.sources)
      ? (message.sources as SourceChunk[])
      : undefined,
    answerMode: message.answerMode as AnswerMode | undefined,
    retrievalStatus: message.retrievalStatus as RetrievalStatus | undefined,
    fallbackReason: message.fallbackReason ?? undefined,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    // 先确认会话属于当前用户，再查询消息。不要只靠 conversationId 查询，否则可能越权读取。
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!conversation) {
      return Response.json({ error: "会话不存在。" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({
      messages: messages.map(toMessageDto),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return Response.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "读取历史消息失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
