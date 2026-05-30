import { getLanceDbConnection } from "@/lib/vector/lancedb-client";
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
