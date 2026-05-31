import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import type { AgentRagResult, AgentRagState } from "@/lib/agent/types";
import { fallbackNode } from "@/lib/agent/nodes/fallback";
import { generateRagNode } from "@/lib/agent/nodes/generate-rag";
import { judgeNode } from "@/lib/agent/nodes/judge";
import { queryRewriteNode } from "@/lib/agent/nodes/query-rewrite";
import { retrieveNode } from "@/lib/agent/nodes/retrieve";
import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import { buildFallbackMessages } from "@/lib/rag/build-fallback-prompt";
import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import type { AnswerMode, RetrievalStatus, SourceChunk } from "@/lib/types/chat";

const AgentStateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  conversationId: Annotation<string | undefined>(),
  userId: Annotation<string>(),
  historyMessages: Annotation<ChatProviderMessage[]>(),
  rewrittenQuestion: Annotation<string | undefined>(),
  sources: Annotation<SourceChunk[]>(),
  retrievalStatus: Annotation<RetrievalStatus>(),
  judgeResult: Annotation<"enough" | "not_enough" | undefined>(),
  judgeReason: Annotation<string | undefined>(),
  answerMode: Annotation<AnswerMode>(),
  fallbackReason: Annotation<string | undefined>(),
  messages: Annotation<ChatProviderMessage[]>(),
  answer: Annotation<string | undefined>(),
  shouldGenerate: Annotation<boolean | undefined>(),
});

function routeAfterJudge(state: AgentRagState) {
  return state.judgeResult === "enough" ? "generateRag" : "fallback";
}

const agenticRagGraph = new StateGraph(AgentStateAnnotation)
  // LangGraph 的节点就是一个个小步骤，每个节点只负责一件事。
  .addNode("queryRewrite", queryRewriteNode)
  .addNode("retrieve", retrieveNode)
  .addNode("judge", judgeNode)
  .addNode("generateRag", generateRagNode)
  .addNode("fallback", fallbackNode)
  // 边表示流程顺序：从 START 到改写，再到检索和判断。
  .addEdge(START, "queryRewrite")
  .addEdge("queryRewrite", "retrieve")
  .addEdge("retrieve", "judge")
  // 条件边根据 state.judgeResult 决定走知识库回答还是普通兜底。
  .addConditionalEdges("judge", routeAfterJudge, {
    generateRag: "generateRag",
    fallback: "fallback",
  })
  .addEdge("generateRag", END)
  .addEdge("fallback", END)
  .compile();

function buildInitialState(params: {
  question: string;
  conversationId?: string;
  userId: string;
  historyMessages: ChatProviderMessage[];
  shouldGenerate: boolean;
}): AgentRagState {
  return {
    question: params.question,
    conversationId: params.conversationId,
    userId: params.userId,
    historyMessages: params.historyMessages,
    sources: [],
    retrievalStatus: "error",
    answerMode: "fallback",
    messages: [],
    shouldGenerate: params.shouldGenerate,
  };
}

function toResult(state: AgentRagState): AgentRagResult {
  return {
    answer: state.answer,
    answerMode: state.answerMode,
    retrievalStatus: state.retrievalStatus,
    fallbackReason: state.fallbackReason,
    sources: state.sources,
    rewrittenQuestion: state.rewrittenQuestion,
    judgeReason: state.judgeReason,
    messages: state.messages,
  };
}

async function fallbackWhenGraphFails(params: {
  question: string;
  historyMessages: ChatProviderMessage[];
  shouldGenerate: boolean;
  error: unknown;
}): Promise<AgentRagResult> {
  const reason =
    params.error instanceof Error
      ? params.error.message
      : "Agentic RAG 图执行失败。";
  const fallbackReason = `Agentic RAG 流程异常，本次使用普通模型回答：${reason}`;
  const messages = buildFallbackMessages({
    question: params.question,
    historyMessages: params.historyMessages,
    fallbackReason,
  });

  if (!params.shouldGenerate) {
    return {
      answerMode: "fallback",
      retrievalStatus: "error",
      fallbackReason,
      sources: [],
      messages,
      judgeReason: fallbackReason,
    };
  }

  const provider = createOpenAICompatibleChatProvider();
  const answer = await provider.generate(messages);

  return {
    answer,
    answerMode: "fallback",
    retrievalStatus: "error",
    fallbackReason,
    sources: [],
    messages,
    judgeReason: fallbackReason,
  };
}

export async function runAgenticRag(params: {
  question: string;
  conversationId?: string;
  userId: string;
  historyMessages: ChatProviderMessage[];
}): Promise<AgentRagResult & { answer: string }> {
  try {
    const finalState = (await agenticRagGraph.invoke(
      buildInitialState({ ...params, shouldGenerate: true }),
    )) as AgentRagState;

    if (!finalState.answer) {
      throw new Error("Agentic RAG 没有生成最终答案。");
    }

    return { ...toResult(finalState), answer: finalState.answer };
  } catch (error) {
    console.error("Agentic RAG graph failed:", error);
    const result = await fallbackWhenGraphFails({
      question: params.question,
      historyMessages: params.historyMessages,
      shouldGenerate: true,
      error,
    });

    return { ...result, answer: result.answer ?? "" };
  }
}

export async function prepareAgenticRagMessages(params: {
  question: string;
  conversationId?: string;
  userId: string;
  historyMessages: ChatProviderMessage[];
}): Promise<AgentRagResult> {
  try {
    const finalState = (await agenticRagGraph.invoke(
      buildInitialState({ ...params, shouldGenerate: false }),
    )) as AgentRagState;

    return toResult(finalState);
  } catch (error) {
    console.error("Agentic RAG prepare graph failed:", error);
    return fallbackWhenGraphFails({
      question: params.question,
      historyMessages: params.historyMessages,
      shouldGenerate: false,
      error,
    });
  }
}
