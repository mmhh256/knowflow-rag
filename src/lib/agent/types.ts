import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import type { AnswerMode, RetrievalStatus, SourceChunk } from "@/lib/types/chat";

export type JudgeResult = "enough" | "not_enough";

// LangGraph 的 state 可以理解成“流程共享数据对象”：
// 每个节点读取其中一部分字段，写入自己负责的新字段，再把 state 交给下一个节点。
export type AgentRagState = {
  // 用户当前输入的原始问题。前端仍然展示这个问题，不展示改写后的问题替代它。
  question: string;
  conversationId?: string;
  userId: string;

  // P9 已经实现的最近历史消息，用来理解“第二点”“它”这类追问。
  historyMessages: ChatProviderMessage[];

  // QueryRewriteNode 输出，主要用于提升向量检索效果。
  rewrittenQuestion?: string;

  // RetrieveNode 输出，命中的知识库片段会继续交给 JudgeNode 和 GenerateRagNode。
  sources: SourceChunk[];
  retrievalStatus: RetrievalStatus;

  // JudgeNode 输出，用来判断 sources 是否真的足够支撑回答。
  judgeResult?: JudgeResult;
  judgeReason?: string;

  // 最终回答模式。rag 表示用了知识库；fallback 表示普通模型兜底。
  answerMode: AnswerMode;
  fallbackReason?: string;

  // 最终传给大模型的 messages。流式接口会复用它来继续 token 流式输出。
  messages: ChatProviderMessage[];
  answer?: string;

  // P10 为了兼容 SSE：普通接口让图直接生成答案；流式接口只让图准备 messages。
  shouldGenerate?: boolean;
};

export type AgentRagResult = {
  answer?: string;
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
  rewrittenQuestion?: string;
  judgeReason?: string;
  messages: ChatProviderMessage[];
};
