import { randomUUID } from "crypto";

import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
import { appConfig } from "@/lib/config";
import { createEmbeddingProvider } from "@/lib/llm/openai-compatible-embedding";
import { chunkText } from "@/lib/rag/chunk-text";
import { prisma } from "@/lib/db";
import {
  addDocumentChunks,
  deleteDocumentVectors,
} from "@/lib/vector/document-vector-store";
import type { DocumentVectorRecord } from "@/lib/types/vector";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "文档索引失败";
}

export async function indexDocument(documentId: string): Promise<{
  documentId: string;
  chunkCount: number;
}> {
  await ensureMockUser();

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId: MOCK_USER_ID,
    },
  });

  if (!document) {
    throw new Error("文档不存在，或不属于当前用户。");
  }

  if (document.status === "indexing") {
    throw new Error("文档正在向量化中，请不要重复提交。");
  }

  if (!["parsed", "indexed", "index_failed"].includes(document.status)) {
    throw new Error("只有已解析的文档才能向量化。");
  }

  if (!document.parsedText?.trim()) {
    throw new Error("文档没有可向量化的 parsedText，请先完成解析。");
  }

  try {
    // 状态改成 indexing 后，前端可以显示“向量化中”，用户知道后端正在处理。
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "indexing",
        indexError: null,
      },
    });

    const chunks = chunkText(document.parsedText, {
      chunkSize: appConfig.rag.chunkSize,
      overlap: appConfig.rag.chunkOverlap,
    });

    if (chunks.length === 0) {
      throw new Error("文本分块结果为空，无法向量化。");
    }

    const embeddingProvider = createEmbeddingProvider();
    const vectors = await embeddingProvider.embedBatch(
      chunks.map((chunk) => chunk.content),
    );

    if (vectors.length !== chunks.length) {
      throw new Error("Embedding 数量和 chunk 数量不一致。");
    }

    const now = new Date().toISOString();
    const records: DocumentVectorRecord[] = chunks.map((chunk, index) => ({
      id: randomUUID(),
      documentId: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      vector: vectors[index],
      createdAt: now,
    }));

    await deleteDocumentVectors(document.id);
    await addDocumentChunks(records);

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "indexed",
        chunkCount: records.length,
        indexError: null,
      },
    });

    return {
      documentId: document.id,
      chunkCount: records.length,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "index_failed",
        indexError: message,
      },
    });

    throw new Error(message);
  }
}
