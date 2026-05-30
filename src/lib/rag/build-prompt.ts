import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import type { SourceChunk } from "@/lib/types/chat";

const RAG_SYSTEM_PROMPT =
  "你是一个知识库问答助手。请优先基于【参考资料】回答用户问题。如果参考资料中没有答案，请明确说明资料不足，不要编造。回答要清晰、准确、结构化。不要编造不存在的来源。";

function truncateContent(content: string, maxLength = 900) {
  return content.length > maxLength
    ? `${content.slice(0, maxLength)}...`
    : content;
}

export function buildRagMessages(params: {
  question: string;
  sources: SourceChunk[];
}): ChatProviderMessage[] {
  // RAG 的关键是把“检索命中的资料片段”拼进 Prompt，让模型基于资料回答，而不是只靠模型记忆。
  // Prompt 也不能无限长，所以每个 source 做简单截断，后续可再优化为 token 级控制。
  const sourceText = params.sources
    .map((source, index) => {
      return [
        `[来源 ${index + 1}]`,
        `文件名：${source.fileName}`,
        `片段序号：${source.chunkIndex ?? "-"}`,
        `内容：${truncateContent(source.content)}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    {
      role: "system",
      content: RAG_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        "用户问题：",
        params.question,
        "",
        "参考资料：",
        sourceText,
      ].join("\n"),
    },
  ];
}
