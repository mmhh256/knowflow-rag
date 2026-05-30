import { getValidatedServerEmbeddingConfig } from "@/lib/config";
import type { EmbeddingProvider } from "@/lib/llm/embedding-provider";

type EmbeddingApiResponse = {
  data?: Array<{
    index?: number;
    embedding?: number[];
  }>;
  error?: {
    message?: string;
  };
};

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function createBatches<T>(items: T[], batchSize: number) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  private readonly batchSize = 10;

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);

    if (!embedding) {
      throw new Error("Embedding API 没有返回向量。");
    }

    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // embedding 是把文本转换成数字向量。后续 P7 会把“用户问题”和“文档 chunk”都转成向量，再比较相似度。
    const config = getValidatedServerEmbeddingConfig();
    const url = `${trimTrailingSlash(config.embeddingBaseUrl)}/embeddings`;
    const allEmbeddings: number[][] = [];

    for (const batch of createBatches(texts, this.batchSize)) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.embeddingApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.embeddingModel,
          input: batch,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as EmbeddingApiResponse;

      if (!response.ok) {
        throw new Error(
          `Embedding API 调用失败：${data.error?.message ?? response.statusText}`,
        );
      }

      if (!Array.isArray(data.data)) {
        throw new Error("Embedding API 返回结构异常：缺少 data 数组。");
      }

      const embeddings = data.data
        .slice()
        .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
        .map((item) => item.embedding);

      if (
        embeddings.length !== batch.length ||
        embeddings.some((embedding) => !Array.isArray(embedding))
      ) {
        throw new Error("Embedding API 返回结构异常：向量数量或格式不正确。");
      }

      allEmbeddings.push(...(embeddings as number[][]));
    }

    return allEmbeddings;
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  return new OpenAICompatibleEmbeddingProvider();
}
