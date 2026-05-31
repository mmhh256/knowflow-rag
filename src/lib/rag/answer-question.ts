import { runAgenticRag } from "@/lib/agent/graph";
import { appConfig } from "@/lib/config";
import { getRecentConversationMessages } from "@/lib/chat/history";
import type { AnswerMode, RetrievalStatus, SourceChunk } from "@/lib/types/chat";

export async function answerQuestionWithRagPriority(params: {
  question: string;
  conversationId?: string;
  userId: string;
}): Promise<{
  answer: string;
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
  rewrittenQuestion?: string;
  judgeReason?: string;
}> {
  const historyMessages = params.conversationId
    ? await getRecentConversationMessages({
        conversationId: params.conversationId,
        userId: params.userId,
        limit: appConfig.conversation.historyLimit,
      })
    : [];

  return runAgenticRag({
    question: params.question,
    conversationId: params.conversationId,
    userId: params.userId,
    historyMessages,
  });
}
