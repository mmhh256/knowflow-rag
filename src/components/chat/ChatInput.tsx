type ChatInputProps = {
  // value 和 onChange 由父组件传入，所以这是一个受控输入框。
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function ChatInput({
  value,
  isLoading,
  onChange,
  onSend,
}: ChatInputProps) {
  // 空输入和请求中都不能发送，避免产生无效请求或重复请求。
  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <div className="mx-auto flex max-w-5xl items-end gap-3">
        <label className="sr-only" htmlFor="chat-question">
          输入问题
        </label>
        <textarea
          id="chat-question"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              // Enter 发送，Shift + Enter 保留 textarea 默认换行能力。
              event.preventDefault();
              if (canSend) {
                onSend();
              }
            }
          }}
          placeholder="请输入你的问题，例如：这份文档的核心结论是什么？"
          className="max-h-40 min-h-12 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          rows={1}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="h-12 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          发送
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-5xl text-xs text-slate-500">
        P4 会保存会话和消息，刷新页面后可以从左侧会话列表重新打开。
      </p>
    </div>
  );
}
