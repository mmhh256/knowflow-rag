import type { DocumentStatus, KnowledgeDocument } from "@/lib/types/document";

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
] as const;

export type SupportedDocumentType = "pdf" | "txt" | "md";

export const documentStatusLabels: Record<DocumentStatus, string> = {
  uploaded: "已上传",
  parsing: "解析中",
  parsed: "已解析",
  parse_failed: "解析失败",
  indexing: "向量化中",
  indexed: "已入库",
  index_failed: "向量化失败",
};

export function getDocumentType(fileName: string): SupportedDocumentType | null {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  if (lowerName.endsWith(".txt")) {
    return "txt";
  }

  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return "md";
  }

  return null;
}

export function formatFileSize(fileSize?: number) {
  if (!fileSize) {
    return "-";
  }

  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / 1024 / 1024).toFixed(1)} MB`;
}

export function createTextPreview(text?: string | null, limit = 300) {
  if (!text) {
    return "";
  }

  const normalizedText = text.replace(/\s+/g, " ").trim();
  return normalizedText.length > limit
    ? `${normalizedText.slice(0, limit)}...`
    : normalizedText;
}

export function toKnowledgeDocument(document: {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  status: string;
  chunkCount: number;
  parsedText?: string | null;
  parseError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): KnowledgeDocument {
  return {
    id: document.id,
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize ?? undefined,
    status: document.status as DocumentStatus,
    chunkCount: document.chunkCount,
    preview: createTextPreview(document.parsedText),
    parseError: document.parseError ?? undefined,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}
