import type { AgentRagState } from "@/lib/agent/types";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";

export async function retrieveNode(
  state: AgentRagState,
): Promise<Partial<AgentRagState>> {
  // 检索节点优先使用改写后的问题，因为它通常比“第二点是什么”更完整。
  // retrieveRelevantChunks 内部会只使用 indexed 文档，避免把未向量化文档误用于问答。
  const retrieval = await retrieveRelevantChunks({
    question: state.rewrittenQuestion || state.question,
    userId: state.userId,
  });

  // 检索失败不直接让接口失败，而是把状态交给后续 Judge/Fallback。
  // 这样知识库临时不可用时，聊天仍然可以用普通模型兜底。
  return {
    sources: retrieval.sources,
    retrievalStatus: retrieval.status,
    fallbackReason: retrieval.fallbackReason,
  };
}
