import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import type { SourceChunk } from "@/lib/types/chat";

const RAG_SYSTEM_PROMPT =
  "你是一个知识库问答助手。请结合当前会话历史理解用户追问，并优先基于【参考资料】回答当前问题。如果参考资料中没有答案，请明确说明资料不足，不要编造。回答要清晰、准确、结构化，不要编造不存在的来源。";

function truncateContent(content: string, maxLength = 900) {
  return content.length > maxLength
    ? `${content.slice(0, maxLength)}...`
    : content;
}

export function buildRagMessages(params: {
  question: string;
  sources: SourceChunk[];
  historyMessages?: ChatProviderMessage[];
}): ChatProviderMessage[] {
  // historyMessages 是同一会话里的历史问答，用来理解“第二点”“它”等追问。
  // sources 是知识库检索命中的资料片段，用来提供事实依据。两者不能混在一起。
  // 当前问题必须放在最后，让模型明确这一轮真正要回答的内容。
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
    ...(params.historyMessages ?? []),
    {
      role: "user",
      content: [
        "当前用户问题：",
        params.question,
        "",
        "参考资料：",
        sourceText,
      ].join("\n"),
    },
  ];
}
