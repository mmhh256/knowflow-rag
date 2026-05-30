import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
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

// GET /api/conversations：读取 mock 用户的会话列表。
// 查询时必须带 userId，避免以后接登录后出现“看到别人会话”的问题。
export async function GET() {
  try {
    await ensureMockUser();

    const conversations = await prisma.conversation.findMany({
      where: { userId: MOCK_USER_ID },
      orderBy: { updatedAt: "desc" },
    });

    return Response.json({
      conversations: conversations.map(toConversationDto),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "读取会话列表失败";
    return Response.json({ error: message }, { status: 500 });
  }
}

// POST /api/conversations：创建一个新会话。
// P4 不做登录，所以先统一绑定 mock-user-001。
export async function POST(req: Request) {
  try {
    await ensureMockUser();
    const body = (await req.json().catch(() => ({}))) as { title?: string };
    const title = body.title?.trim() || "新会话";

    const conversation = await prisma.conversation.create({
      data: {
        title,
        userId: MOCK_USER_ID,
      },
    });

    return Response.json({ conversation: toConversationDto(conversation) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建会话失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
