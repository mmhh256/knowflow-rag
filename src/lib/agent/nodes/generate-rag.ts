import type { AgentRagState } from "@/lib/agent/types";
import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import { buildRagMessages } from "@/lib/rag/build-prompt";

export async function generateRagNode(
  state: AgentRagState,
): Promise<Partial<AgentRagState>> {
  // 生成答案使用用户原始问题，因为原始问题才是用户真正想看的表达；
  // rewrittenQuestion 只用于检索，避免前端问题和模型回答语境不一致。
  const messages = buildRagMessages({
    question: state.question,
    sources: state.sources,
    historyMessages: state.historyMessages,
  });

  if (state.shouldGenerate === false) {
    return {
      messages,
      answerMode: "rag",
      fallbackReason: undefined,
    };
  }

  const provider = createOpenAICompatibleChatProvider();
  const answer = await provider.generate(messages);

  return {
    answer,
    messages,
    answerMode: "rag",
    fallbackReason: undefined,
  };
}
