export type DocumentVectorRecord = {
  id: string;
  documentId: string;
  fileName: string;
  fileType: string;
  content: string;
  chunkIndex: number;
  vector: number[];
  createdAt: string;
};
