import { SourcePanel } from "@/components/chat/SourcePanel";
import type { ChatMessage, RetrievalStatus } from "@/components/chat/types";

type MessageBubbleProps = {
  message: ChatMessage;
};

const retrievalStatusText: Record<RetrievalStatus, string> = {
  hit: "已基于知识库检索结果回答",
  no_documents: "当前没有已入库文档，本次使用普通模型回答",
  no_chunks: "知识库没有检索到相关片段，本次使用普通模型回答",
  low_score: "知识库未找到强相关内容，本次使用普通模型回答",
  error: "知识库检索异常，本次使用普通模型回答",
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const createdAt = new Date(message.createdAt);
  const displayTime = Number.isNaN(createdAt.getTime())
    ? message.createdAt
    : createdAt.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[86%] text-sm leading-6 ${
          isUser
            ? "rounded-lg bg-blue-500 px-4 py-3 text-white shadow-sm"
            : "text-slate-700"
        }`}
      >
        {!isUser ? (
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100">
              AI
            </span>
            <span>
              {message.answerMode === "rag"
                ? "知识库增强回答"
                : "普通模型回答"}
            </span>
          </div>
        ) : null}

        <div className="whitespace-pre-wrap">{message.content}</div>

        {!isUser && message.answerMode ? (
          <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
            <div className="font-medium text-slate-600">
              {message.answerMode === "rag"
                ? "知识库增强回答"
                : "普通模型回答"}
            </div>
            {message.retrievalStatus ? (
              <div className="mt-1">
                {retrievalStatusText[message.retrievalStatus]}
              </div>
            ) : null}
            {message.fallbackReason ? (
              <div className="mt-1">{message.fallbackReason}</div>
            ) : null}
          </div>
        ) : null}

        {!isUser && message.sources?.length ? (
          <SourcePanel sources={message.sources} />
        ) : null}

        <div
          className={`mt-3 text-xs ${
            isUser ? "text-blue-100" : "text-slate-400"
          }`}
        >
          {isUser ? "用户" : "助手"} · {displayTime}
        </div>
      </article>
    </div>
  );
}
