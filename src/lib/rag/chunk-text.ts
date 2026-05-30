export type TextChunk = {
  content: string;
  chunkIndex: number;
};

type ChunkTextOptions = {
  chunkSize?: number;
  overlap?: number;
  minChunkLength?: number;
};

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

export function chunkText(
  text: string,
  options: ChunkTextOptions = {},
): TextChunk[] {
  // RAG 不能把整篇文档一次性塞给大模型：文档太长会超过上下文限制，也会让检索不精确。
  // 所以 P6 先用简单可靠的字符分块，把 parsedText 切成后续可向量化的小片段。
  const chunkSize = options.chunkSize ?? 800;
  const overlap = options.overlap ?? 100;
  const minChunkLength = options.minChunkLength ?? 30;
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return [];
  }

  if (chunkSize <= overlap) {
    throw new Error("chunkSize 必须大于 overlap，否则分块无法向前推进。");
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    const end = Math.min(start + chunkSize, normalizedText.length);
    const content = normalizedText.slice(start, end).trim();

    if (content.length >= minChunkLength) {
      chunks.push({
        content,
        chunkIndex: chunks.length,
      });
    }

    if (end >= normalizedText.length) {
      break;
    }

    // overlap 会让相邻 chunk 保留一段重复内容，避免一句话正好被切断后丢失上下文。
    start = end - overlap;
  }

  return chunks;
}
