import type { ChatProviderMessage } from "@/lib/llm/chat-provider";

const FALLBACK_SYSTEM_PROMPT =
  "你是一个专业、清晰、耐心的 AI 助手。当前回答没有使用知识库来源，而是基于模型通用能力回答。请结合当前会话历史理解用户追问，但不要谎称使用了知识库资料。";

export function buildFallbackMessages(params: {
  question: string;
  historyMessages?: ChatProviderMessage[];
  fallbackReason?: string;
}): ChatProviderMessage[] {
  // fallback 也需要历史消息：即使没有命中知识库，用户仍然可能继续追问“刚才第二点”。
  // fallbackReason 放进 system 提示，是为了让模型知道为什么本次没有知识库来源。
  const systemContent = params.fallbackReason
    ? `${FALLBACK_SYSTEM_PROMPT}\n本次未使用知识库的原因：${params.fallbackReason}`
    : FALLBACK_SYSTEM_PROMPT;

  return [
    {
      role: "system",
      content: systemContent,
    },
    ...(params.historyMessages ?? []),
    {
      role: "user",
      content: params.question,
    },
  ];
}
