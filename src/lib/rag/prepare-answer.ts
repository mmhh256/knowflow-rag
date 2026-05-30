import { appConfig } from "@/lib/config";
import { getRecentConversationMessages } from "@/lib/chat/history";
import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import { buildFallbackMessages } from "@/lib/rag/build-fallback-prompt";
import { buildRagMessages } from "@/lib/rag/build-prompt";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
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
}> {
  // P9 选择“先读取历史，再保存当前 user 消息”的方案。
  // 这样 historyMessages 只包含当前问题之前的上下文，最后再把当前 question 放到 prompt 末尾，
  // 可以避免“当前问题在历史里出现一次、在当前问题里又出现一次”的重复注入。
  const historyMessages = params.conversationId
    ? await getRecentConversationMessages({
        conversationId: params.conversationId,
        userId: params.userId,
        limit: appConfig.conversation.historyLimit,
      })
    : [];

  const retrieval = await retrieveRelevantChunks({ question: params.question });

  if (retrieval.status === "hit") {
    return {
      messages: buildRagMessages({
        question: params.question,
        sources: retrieval.sources,
        historyMessages,
      }),
      answerMode: "rag",
      retrievalStatus: "hit",
      sources: retrieval.sources,
    };
  }

  return {
    messages: buildFallbackMessages({
      question: params.question,
      historyMessages,
      fallbackReason: retrieval.fallbackReason,
    }),
    answerMode: "fallback",
    retrievalStatus: retrieval.status,
    fallbackReason: retrieval.fallbackReason,
    sources: [],
  };
}
