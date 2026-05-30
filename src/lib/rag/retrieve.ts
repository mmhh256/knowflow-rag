import { MOCK_USER_ID, ensureMockUser } from "@/lib/auth/mock-user";
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
  topK?: number;
  scoreThreshold?: number;
  documentIds?: string[];
}): Promise<RetrieveResult> {
  try {
    await ensureMockUser();

    // no_documents：当前用户没有 indexed 文档，说明知识库还没准备好，直接 fallback，不浪费 Embedding API。
    const indexedDocuments = await prisma.document.findMany({
      where: {
        userId: MOCK_USER_ID,
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

    // no_chunks：有 indexed 文档，但 LanceDB 没查到 chunk，常见原因是向量库数据被清空或索引失败后状态没同步。
    if (sources.length === 0) {
      return {
        status: "no_chunks",
        sources: [],
        fallbackReason: "知识库没有检索到可用片段，本次使用普通模型回答。",
      };
    }

    const threshold = params.scoreThreshold ?? appConfig.rag.scoreThreshold;
    const bestScore = Math.max(...sources.map((source) => source.score));

    // low_score：检索到了内容，但相关性不够。强行使用低相关资料会让 RAG 变成“带资料的胡编”。
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

    // error：检索或 embedding 失败。这里不让聊天整体失败，而是交给 answer-question 走普通 LLM 兜底。
    return {
      status: "error",
      sources: [],
      fallbackReason: `知识库检索异常，本次使用普通模型回答。${message}`,
    };
  }
}
