import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import type { Conversation } from "@/lib/types/chat";

type RenameConversationBody = {
  title?: string;
};

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

async function findOwnedConversation(conversationId: string, userId: string) {
  // 所有会话操作都必须带 userId 条件，避免用户通过猜 id 修改或删除别人的会话。
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as RenameConversationBody;
    const title = body.title?.trim() ?? "";

    if (!title) {
      return Response.json({ error: "会话名称不能为空。" }, { status: 400 });
    }

    if (title.length > 40) {
      return Response.json(
        { error: "会话名称不能超过 40 个字。" },
        { status: 400 },
      );
    }

    const conversation = await findOwnedConversation(id, user.id);
    if (!conversation) {
      return Response.json({ error: "会话不存在。" }, { status: 404 });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { title },
    });

    return Response.json({
      conversation: toConversationDto(updatedConversation),
    });
  } catch (error) {
    return handleError(error, "重命名会话失败");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const conversation = await findOwnedConversation(id, user.id);
    if (!conversation) {
      return Response.json({ error: "会话不存在。" }, { status: 404 });
    }

    // Conversation 和 Message 是一对多关系。当前 schema 没有开启级联删除，
    // 所以后端先删除该会话下的消息，再删除会话本身，避免外键约束报错。
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId: id } }),
      prisma.conversation.delete({ where: { id } }),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    return handleError(error, "删除会话失败");
  }
}
