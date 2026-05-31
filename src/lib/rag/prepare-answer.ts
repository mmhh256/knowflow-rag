import { prepareAgenticRagMessages } from "@/lib/agent/graph";
import { appConfig } from "@/lib/config";
import { getRecentConversationMessages } from "@/lib/chat/history";
import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import type { AnswerMode, RetrievalStatus, SourceChunk } from "@/lib/types/chat";

export async function prepareRagPriorityAnswer(params: {
  question: string;
  conversationId?: string;
  userId: string;
}): Promise<{
  messages: ChatProviderMessage[];
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
  rewrittenQuestion?: string;
  judgeReason?: string;
}> {
  // P9 已经确定“先读历史，再保存当前 user 消息”的顺序。
  // P10 保留这个顺序：LangGraph 读取的是当前问题之前的历史，当前问题只作为最后一条 user message 注入一次。
  const historyMessages = params.conversationId
    ? await getRecentConversationMessages({
        conversationId: params.conversationId,
        userId: params.userId,
        limit: appConfig.conversation.historyLimit,
      })
    : [];

  // P10 的 Agentic RAG 不再把 RAG 写成一个大函数，而是交给 LangGraph 节点：
  // 问题改写 -> 检索 -> 判断 -> 知识库回答或普通兜底。
  return prepareAgenticRagMessages({
    question: params.question,
    conversationId: params.conversationId,
    userId: params.userId,
    historyMessages,
  });
}
