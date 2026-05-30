import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import { prepareRagPriorityAnswer } from "@/lib/rag/prepare-answer";
import type { AnswerMode, RetrievalStatus, SourceChunk } from "@/lib/types/chat";

export async function answerQuestionWithRagPriority(params: {
  question: string;
  conversationId?: string;
}): Promise<{
  answer: string;
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
}> {
  // 先准备好 RAG 的决策结果和 prompt，复用同一套检索逻辑。
  const prepared = await prepareRagPriorityAnswer({
    question: params.question,
  });
  const chatProvider = createOpenAICompatibleChatProvider();
  // 检索失败可以 fallback，因为用户仍然可以得到普通模型回答；
  // 但如果模型生成失败，就没有可返回的回答了，应由 /api/chat 返回真正错误。
  const answer = await chatProvider.generate(prepared.messages);

  return {
    answer,
    answerMode: prepared.answerMode,
    retrievalStatus: prepared.retrievalStatus,
    fallbackReason: prepared.fallbackReason,
    sources: prepared.sources,
  };
}
