import { getLanceDbConnection } from "@/lib/vector/lancedb-client";
import type { SourceChunk } from "@/lib/types/chat";
import type { DocumentVectorRecord } from "@/lib/types/vector";

const DOCUMENT_CHUNKS_TABLE = "document_chunks";

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''");
}

async function getTableIfExists() {
  const db = await getLanceDbConnection();
  const tableNames = await db.tableNames();

  if (!tableNames.includes(DOCUMENT_CHUNKS_TABLE)) {
    return null;
  }

  return db.openTable(DOCUMENT_CHUNKS_TABLE);
}

export async function addDocumentChunks(records: DocumentVectorRecord[]) {
  if (records.length === 0) {
    return;
  }

  const db = await getLanceDbConnection();
  const tableNames = await db.tableNames();

  // 向量库里不能只存 vector。P7 展示 sources 时还需要 content、documentId、fileName、chunkIndex 等 metadata。
  if (!tableNames.includes(DOCUMENT_CHUNKS_TABLE)) {
    await db.createTable(DOCUMENT_CHUNKS_TABLE, records);
    return;
  }

  const table = await db.openTable(DOCUMENT_CHUNKS_TABLE);
  await table.add(records);
}

export async function deleteDocumentVectors(documentId: string) {
  const table = await getTableIfExists();

  if (!table) {
    return;
  }

  // 重新索引前先删除旧向量，避免同一个文档重复入库，导致 P7 检索时命中重复 chunk。
  await table.delete(`documentId = '${escapeSqlString(documentId)}'`);
}

function distanceToScore(distance: unknown) {
  const numericDistance = Number(distance);

  if (!Number.isFinite(numericDistance)) {
    return 0;
  }

  // LanceDB 查询结果通常返回 _distance，distance 越小表示越相似。
  // 项目内部统一使用 score，score 越大表示越相关，因此用 1 / (1 + distance) 做简单转换。
  return 1 / (1 + Math.max(numericDistance, 0));
}

function buildDocumentFilter(documentIds?: string[]) {
  if (!documentIds?.length) {
    return undefined;
  }

  const escapedIds = documentIds.map((id) => `'${escapeSqlString(id)}'`);
  return `documentId IN (${escapedIds.join(", ")})`;
}

export async function searchSimilarChunks(params: {
  queryVector: number[];
  topK: number;
  documentIds?: string[];
}): Promise<SourceChunk[]> {
  const table = await getTableIfExists();

  if (!table) {
    return [];
  }

  // 向量检索的核心：用“用户问题的 queryVector”去 LanceDB 里找最接近的文档 chunk vector。
  // 返回时必须带 content 和 metadata，因为这些内容会在 P7 作为 sources 展示给用户。
  let query = table
    .vectorSearch(params.queryVector)
    .limit(params.topK)
    .select([
      "id",
      "documentId",
      "fileName",
      "fileType",
      "content",
      "chunkIndex",
      "_distance",
    ]);

  const documentFilter = buildDocumentFilter(params.documentIds);
  if (documentFilter) {
    query = query.where(documentFilter);
  }

  const rows = (await query.toArray()) as Array<{
    id?: string;
    documentId?: string;
    fileName?: string;
    fileType?: string;
    content?: string;
    chunkIndex?: number;
    _distance?: number;
  }>;

  return rows
    .filter((row) => row.id && row.documentId && row.fileName && row.content)
    .map((row) => ({
      id: row.id as string,
      documentId: row.documentId as string,
      fileName: row.fileName as string,
      fileType: row.fileType,
      content: row.content as string,
      chunkIndex: row.chunkIndex,
      score: distanceToScore(row._distance),
    }));
}
