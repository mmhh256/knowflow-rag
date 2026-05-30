export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "parse_failed"
  | "indexing"
  | "indexed"
  | "index_failed";

// 前端文档列表只需要展示元信息和预览，不直接拿完整 parsedText，避免列表接口变得很重。
export type KnowledgeDocument = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  status: DocumentStatus;
  chunkCount: number;
  preview?: string;
  parseError?: string;
  indexError?: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentIndexResponse = {
  document: {
    id: string;
    fileName: string;
    status: "indexed";
    chunkCount: number;
  };
};

export type DocumentListResponse = {
  documents: KnowledgeDocument[];
};

export type DocumentUploadResponse = {
  document: KnowledgeDocument;
};

export type DocumentDetailResponse = {
  document: KnowledgeDocument & {
    parsedTextPreview?: string;
  };
};
