import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import { prepareRagPriorityAnswer } from "@/lib/rag/prepare-answer";
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
}> {
  // 这个函数保留给普通一次性回答场景使用。P9 的历史上下文已经在 prepareRagPriorityAnswer 中统一拼好。
  const prepared = await prepareRagPriorityAnswer({
    question: params.question,
    conversationId: params.conversationId,
    userId: params.userId,
  });
  const chatProvider = createOpenAICompatibleChatProvider();
  const answer = await chatProvider.generate(prepared.messages);

  return {
    answer,
    answerMode: prepared.answerMode,
    retrievalStatus: prepared.retrievalStatus,
    fallbackReason: prepared.fallbackReason,
    sources: prepared.sources,
  };
}
