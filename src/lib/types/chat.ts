export type SourceChunk = {
  id: string;
  documentId: string;
  fileName: string;
  fileType?: string;
  content: string;
  // score 表示检索命中分数。P7 中由 LanceDB 的 distance 转换而来，越接近 1 越相关。
  score: number;
  page?: number;
  chunkIndex?: number;
};

export type AnswerMode = "rag" | "fallback";

export type RetrievalStatus =
  | "hit"
  | "no_documents"
  | "no_chunks"
  | "low_score"
  | "error";

export type ChatRequest = {
  // 前端发送给 /api/chat 的用户问题。
  question: string;
  // 没有 conversationId 时，后端会自动创建一个新会话。
  conversationId?: string;
};

export type ChatStreamRequest = {
  // 前端发送给 /api/chat/stream 的用户问题。
  question: string;
  // 没有 conversationId 时，后端会自动创建一个新会话。
  conversationId?: string;
};

export type ChatResponse = {
  conversationId: string;
  // 后端返回给前端展示的助手回复。
  answer: string;
  // P4 仍然为空，P7 RAG 阶段会返回命中的文档片段。
  sources: SourceChunk[];
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
};

export type ChatStreamMeta = {
  conversationId: string;
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
};

export type ChatStreamDone = {
  messageId: string;
  answer: string;
};

export type ChatErrorResponse = {
  error: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  // role 决定消息气泡靠左还是靠右，以及使用哪一种样式。
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  answerMode?: AnswerMode;
  retrievalStatus?: RetrievalStatus;
  fallbackReason?: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
