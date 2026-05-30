import type { ChatMessage } from "@/components/chat/types";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  // role 决定消息是用户气泡还是助手回复，也决定布局方向。
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
            <span>根据参考文档生成</span>
          </div>
        ) : null}

        <div className="whitespace-pre-wrap">{message.content}</div>

        {!isUser && message.answerMode ? (
          <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
            {message.answerMode === "fallback" ? "普通模型回答" : "知识库增强回答"}
            {message.fallbackReason ? ` · ${message.fallbackReason}` : ""}
          </div>
        ) : null}

        {/* 引用来源跟随助手消息展示；P2 sources 为空，后续 RAG 阶段会填充。 */}
        {!isUser && message.sources?.length ? (
          <div className="mt-4 rounded-lg bg-slate-100 px-4 py-3">
            <div className="text-xs font-semibold text-slate-500">
              参考来源
            </div>
            <div className="mt-2 space-y-2">
              {message.sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-start justify-between gap-4 text-xs text-slate-600"
                >
                  <div>
                    <div className="font-medium text-slate-700">
                      {source.fileName}
                    </div>
                    <div className="mt-1 line-clamp-2">{source.content}</div>
                  </div>
                  <div className="shrink-0 text-slate-400">
                    {Math.round(source.score * 100)}% 匹配
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={`mt-3 text-xs ${
            isUser ? "text-blue-100" : "text-slate-400"
          }`}
      >
          {/* 时间和角色放在气泡底部，方便调试消息生成顺序。 */}
          {isUser ? "用户" : "助手"} · {displayTime}
        </div>
      </article>
    </div>
  );
}
