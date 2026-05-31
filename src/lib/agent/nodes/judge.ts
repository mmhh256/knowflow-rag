import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import type { AgentRagState, JudgeResult } from "@/lib/agent/types";

function compactSources(state: AgentRagState) {
  return state.sources
    .map((source, index) => {
      return [
        `[资料 ${index + 1}]`,
        `文件：${source.fileName}`,
        `片段：${source.chunkIndex ?? "-"}`,
        `相似度：${source.score}`,
        `内容：${source.content.slice(0, 700)}`,
      ].join("\n");
    })
    .join("\n\n");
}

function parseJudgeResult(text: string): {
  result: JudgeResult;
  reason: string;
} {
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        result?: string;
        reason?: string;
      };

      if (parsed.result === "enough" || parsed.result === "not_enough") {
        return {
          result: parsed.result,
          reason: parsed.reason || "模型已完成资料充分性判断。",
        };
      }
    } catch {
      // 如果模型没有返回严格 JSON，继续走下面的宽松判断。
    }
  }

  if (text.toLowerCase().includes("enough") && !text.includes("not_enough")) {
    return { result: "enough", reason: text.slice(0, 120) };
  }

  return { result: "not_enough", reason: text.slice(0, 120) || "资料不足。" };
}

export async function judgeNode(
  state: AgentRagState,
): Promise<Partial<AgentRagState>> {
  // 如果前面没有真正命中资料，就没有必要再让模型判断，直接走兜底。
  if (state.retrievalStatus !== "hit" || state.sources.length === 0) {
    return {
      judgeResult: "not_enough",
      judgeReason: state.fallbackReason || "没有可用于判断的知识库资料。",
    };
  }

  try {
    const provider = createOpenAICompatibleChatProvider();
    const resultText = await provider.generate([
      {
        role: "system",
        content:
          '你是一个知识库检索结果评估器。请判断参考资料是否足够回答用户问题。只返回 JSON：{"result":"enough 或 not_enough","reason":"简短说明原因"}。不要回答用户问题，只做判断。',
      },
      {
        role: "user",
        content: [
          "用户问题：",
          state.question,
          "",
          "检索问题：",
          state.rewrittenQuestion || state.question,
          "",
          "参考资料：",
          compactSources(state),
        ].join("\n"),
      },
    ]);
    const parsed = parseJudgeResult(resultText);

    return {
      judgeResult: parsed.result,
      judgeReason: parsed.reason,
      fallbackReason:
        parsed.result === "not_enough"
          ? `检索结果不足以支撑回答：${parsed.reason}`
          : state.fallbackReason,
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "资料充分性判断失败。";
    console.warn("Judge node failed, fallback conservatively:", error);

    // Judge 失败时保守兜底，避免把可能不相关的资料强行塞给模型。
    return {
      judgeResult: "not_enough",
      judgeReason: `判断节点异常：${reason}`,
      fallbackReason: "知识库资料判断过程异常，本次使用普通模型回答。",
    };
  }
}
