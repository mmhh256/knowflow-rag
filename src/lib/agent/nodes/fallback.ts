import type { AgentRagState } from "@/lib/agent/types";
import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import { buildFallbackMessages } from "@/lib/rag/build-fallback-prompt";

function fallbackReasonFromState(state: AgentRagState) {
  if (state.fallbackReason) {
    return state.fallbackReason;
  }

  if (state.judgeReason) {
    return `知识库资料不足：${state.judgeReason}`;
  }

  return "当前知识库没有找到足够可靠的资料，本次使用普通模型回答。";
}

export async function fallbackNode(
  state: AgentRagState,
): Promise<Partial<AgentRagState>> {
  const fallbackReason = fallbackReasonFromState(state);
  const messages = buildFallbackMessages({
    question: state.question,
    historyMessages: state.historyMessages,
    fallbackReason,
  });

  if (state.shouldGenerate === false) {
    return {
      messages,
      answerMode: "fallback",
      sources: [],
      fallbackReason,
    };
  }

  const provider = createOpenAICompatibleChatProvider();
  const answer = await provider.generate(messages);

  // fallback 不是接口失败，而是知识库资料不足时的兜底策略。
  // 兜底时不能展示 sources，否则用户会误以为回答来自知识库。
  return {
    answer,
    messages,
    answerMode: "fallback",
    sources: [],
    fallbackReason,
  };
}
