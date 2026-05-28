import type { ChatMessage } from "@/components/chat/types";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

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
                      {source.title}
                    </div>
                    <div className="mt-1 line-clamp-2">{source.excerpt}</div>
                  </div>
                  <div className="shrink-0 text-slate-400">
                    {source.score} 匹配
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
          {isUser ? "用户" : "助手"} · {message.createdAt}
        </div>
      </article>
    </div>
  );
}
