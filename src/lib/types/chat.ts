export type SourceChunk = {
  id: string;
  documentId: string;
  fileName: string;
  content: string;
  // score 表示检索命中分数，P2 先不用，后续展示引用来源时会用到。
  score: number;
  page?: number;
  chunkIndex?: number;
};

export type ChatRequest = {
  // 前端发送给 /api/chat 的用户问题。
  question: string;
};

export type ChatResponse = {
  // 后端返回给前端展示的助手回复。
  answer: string;
  // P2 暂时为空，P7 RAG 阶段会返回命中的文档片段。
  sources: SourceChunk[];
};

export type ChatErrorResponse = {
  error: string;
};

export type ChatMessage = {
  id: string;
  // role 决定消息气泡靠左还是靠右，以及使用哪一种样式。
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  createdAt: string;
};
