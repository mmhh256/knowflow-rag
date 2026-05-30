import { appConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import type { ChatProviderMessage } from "@/lib/llm/chat-provider";

const MAX_HISTORY_MESSAGE_LENGTH = 1200;

function truncateHistoryContent(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= MAX_HISTORY_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_HISTORY_MESSAGE_LENGTH)}...`;
}

export async function getRecentConversationMessages(params: {
  conversationId: string;
  userId: string;
  limit?: number;
}): Promise<ChatProviderMessage[]> {
  const limit = params.limit ?? appConfig.conversation.historyLimit;

  // 多轮对话的关键是“同一个 conversationId 下的最近消息”。
  // 这里先确认会话属于当前用户，避免以后做真实登录后出现 A 用户读到 B 用户上下文的问题。
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
    select: { id: true },
  });

  if (!conversation) {
    return [];
  }

  // 数据库按倒序取最近 N 条更高效，但模型需要按真实聊天顺序阅读，所以后面要 reverse 成正序。
  // 不能把全部历史都塞进 prompt：会增加 token 成本，也可能让很久以前的话题干扰当前问题。
  const recentMessages = await prisma.message.findMany({
    where: {
      conversationId: params.conversationId,
      role: { in: ["user", "assistant"] },
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(0, limit),
    select: {
      role: true,
      content: true,
    },
  });

  return recentMessages
    .reverse()
    .map((message): ChatProviderMessage | null => {
      if (message.role !== "user" && message.role !== "assistant") {
        return null;
      }

      return {
        role: message.role,
        content: truncateHistoryContent(message.content),
      };
    })
    .filter((message): message is ChatProviderMessage => Boolean(message));
}
