import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import { buildRagMessages } from "@/lib/rag/build-prompt";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import type { AnswerMode, RetrievalStatus, SourceChunk } from "@/lib/types/chat";

const FALLBACK_SYSTEM_PROMPT =
  "你是一个专业、清晰、耐心的 AI 助手。当前知识库没有找到足够相关的资料，请基于你的通用知识回答，并提醒用户该回答未使用知识库来源。";

function buildFallbackMessages(question: string): ChatProviderMessage[] {
  return [
    { role: "system", content: FALLBACK_SYSTEM_PROMPT },
    { role: "user", content: question },
  ];
}

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
  // RAG 优先：先尝试知识库检索，命中才用 RAG；不命中或检索异常就自动 fallback。
  const retrieval = await retrieveRelevantChunks({
    question: params.question,
  });
  const chatProvider = createOpenAICompatibleChatProvider();

  if (retrieval.status === "hit") {
    const answer = await chatProvider.generate(
      buildRagMessages({
        question: params.question,
        sources: retrieval.sources,
      }),
    );

    return {
      answer,
      answerMode: "rag",
      retrievalStatus: "hit",
      sources: retrieval.sources,
    };
  }

  // 检索失败可以 fallback，因为用户仍然可以得到普通模型回答；
  // 但如果模型生成失败，就没有可返回的回答了，应由 /api/chat 返回真正错误。
  const answer = await chatProvider.generate(buildFallbackMessages(params.question));

  return {
    answer,
    answerMode: "fallback",
    retrievalStatus: retrieval.status,
    fallbackReason: retrieval.fallbackReason,
    sources: [],
  };
}
