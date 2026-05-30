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

export async function prepareRagPriorityAnswer(params: {
  question: string;
}): Promise<{
  messages: ChatProviderMessage[];
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
}> {
  // 把“检索 + prompt 组装”提前准备好，
  // 让普通接口和流式接口都能复用同一套 RAG 决策逻辑。
  const retrieval = await retrieveRelevantChunks({ question: params.question });

  if (retrieval.status === "hit") {
    return {
      messages: buildRagMessages({
        question: params.question,
        sources: retrieval.sources,
      }),
      answerMode: "rag",
      retrievalStatus: "hit",
      sources: retrieval.sources,
    };
  }

  return {
    messages: buildFallbackMessages(params.question),
    answerMode: "fallback",
    retrievalStatus: retrieval.status,
    fallbackReason: retrieval.fallbackReason,
    sources: [],
  };
}
