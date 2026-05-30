import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
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

// GET /api/conversations/[id]/messages：读取某个会话的历史消息。
// 这里先确认会话属于 mock 用户，再查消息，避免越权读取其他用户数据。
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureMockUser();
    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: MOCK_USER_ID,
      },
    });

    if (!conversation) {
      return Response.json({ error: "会话不存在" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({
      messages: messages.map(toMessageDto),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取历史消息失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
