import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import type { AgentRagState } from "@/lib/agent/types";

function formatHistory(state: AgentRagState) {
  return state.historyMessages
    .map((message) => {
      const roleText = message.role === "assistant" ? "助手" : "用户";
      return `${roleText}：${message.content}`;
    })
    .join("\n");
}

function cleanupQuestion(text: string) {
  return text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

export async function queryRewriteNode(
  state: AgentRagState,
): Promise<Partial<AgentRagState>> {
  // 追问通常缺少完整主语，例如“第二点详细说一下”。
  // 直接拿这种短句做向量检索，可能找不到正确 chunk；所以先结合历史改写成完整问题。
  if (state.historyMessages.length === 0) {
    return { rewrittenQuestion: state.question };
  }

  try {
    const provider = createOpenAICompatibleChatProvider();
    const rewrittenQuestion = cleanupQuestion(
      await provider.generate([
        {
          role: "system",
          content:
            "你是一个检索问题改写助手。你的任务是结合历史对话，把用户当前问题改写成一个完整、具体、适合知识库检索的问题。只输出改写后的问题，不要回答问题，不要添加无关信息。如果当前问题已经很完整，直接返回原问题。",
        },
        {
          role: "user",
          content: [
            "历史对话：",
            formatHistory(state),
            "",
            "当前问题：",
            state.question,
          ].join("\n"),
        },
      ]),
    );

    // 改写只用于检索，不会替换前端展示的原始用户问题。
    return { rewrittenQuestion: rewrittenQuestion || state.question };
  } catch (error) {
    console.warn("Query rewrite failed, fallback to original question:", error);
    // 改写失败不是致命错误，回退到原问题即可继续 RAG 或 fallback。
    return { rewrittenQuestion: state.question };
  }
}
