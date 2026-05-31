import { appConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { createEmbeddingProvider } from "@/lib/llm/openai-compatible-embedding";
import type { RetrievalStatus, SourceChunk } from "@/lib/types/chat";
import { searchSimilarChunks } from "@/lib/vector/document-vector-store";

type RetrieveResult = {
  status: RetrievalStatus;
  sources: SourceChunk[];
  fallbackReason?: string;
};

export async function retrieveRelevantChunks(params: {
  question: string;
  userId: string;
  topK?: number;
  scoreThreshold?: number;
  documentIds?: string[];
}): Promise<RetrieveResult> {
  try {
    // 只查询当前用户 indexed 状态的文档。未索引、解析失败或其他用户的文档都不能参与问答。
    const indexedDocuments = await prisma.document.findMany({
      where: {
        userId: params.userId,
        status: "indexed",
        ...(params.documentIds?.length
          ? { id: { in: params.documentIds } }
          : {}),
      },
      select: { id: true },
    });

    if (indexedDocuments.length === 0) {
      return {
        status: "no_documents",
        sources: [],
        fallbackReason: "当前没有已入库文档，本次使用普通模型回答。",
      };
    }

    const embeddingProvider = createEmbeddingProvider();
    const queryVector = await embeddingProvider.embed(params.question);
    const sources = await searchSimilarChunks({
      queryVector,
      topK: params.topK ?? appConfig.rag.topK,
      documentIds: indexedDocuments.map((document) => document.id),
    });

    if (sources.length === 0) {
      return {
        status: "no_chunks",
        sources: [],
        fallbackReason: "知识库没有检索到可用片段，本次使用普通模型回答。",
      };
    }

    const threshold = params.scoreThreshold ?? appConfig.rag.scoreThreshold;
    const bestScore = Math.max(...sources.map((source) => source.score));

    if (bestScore < threshold) {
      return {
        status: "low_score",
        sources: [],
        fallbackReason: "知识库未找到强相关内容，本次使用普通模型回答。",
      };
    }

    return {
      status: "hit",
      sources,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "知识库检索过程出现异常。";

    return {
      status: "error",
      sources: [],
      fallbackReason: `知识库检索异常，本次使用普通模型回答。${message}`,
    };
  }
}
