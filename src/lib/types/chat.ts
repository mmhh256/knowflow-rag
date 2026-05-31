export type SourceChunk = {
  id: string;
  documentId: string;
  fileName: string;
  fileType?: string;
  // score 表示检索命中分数。P7 中由 LanceDB 的 distance 转换而来，越接近 1 越相关。
  score: number;
  content: string;
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
  question: string;
  // 没有 conversationId 时，后端会自动创建一个新会话。
  conversationId?: string;
};

export type ChatStreamRequest = ChatRequest;

export type ChatResponse = {
  conversationId: string;
  answer: string;
  sources: SourceChunk[];
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  // P10 Agentic RAG 调试信息：改写后的问题只用于检索，不替换用户原始问题。
  rewrittenQuestion?: string;
  // P10 Agentic RAG 调试信息：JudgeNode 判断资料是否足够的原因。
  judgeReason?: string;
};

export type ChatStreamMeta = {
  conversationId: string;
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
  rewrittenQuestion?: string;
  judgeReason?: string;
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
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  answerMode?: AnswerMode;
  retrievalStatus?: RetrievalStatus;
  fallbackReason?: string;
  rewrittenQuestion?: string;
  judgeReason?: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
