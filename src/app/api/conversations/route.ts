import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import type { Conversation } from "@/lib/types/chat";

function toConversationDto(conversation: {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}): Conversation {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function handleError(error: unknown, fallback: string) {
  if (isUnauthorizedError(error)) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  const message = error instanceof Error ? error.message : fallback;
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireCurrentUser();

    // 会话列表必须按当前登录用户过滤，避免 A 用户看到 B 用户的聊天记录。
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return Response.json({
      conversations: conversations.map(toConversationDto),
    });
  } catch (error) {
    return handleError(error, "读取会话列表失败");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await req.json().catch(() => ({}))) as { title?: string };
    const title = body.title?.trim() || "新会话";

    const conversation = await prisma.conversation.create({
      data: {
        title,
        userId: user.id,
      },
    });

    return Response.json({ conversation: toConversationDto(conversation) });
  } catch (error) {
    return handleError(error, "创建会话失败");
  }
}
