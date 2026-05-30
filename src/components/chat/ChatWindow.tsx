import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessage, StreamStatus } from "@/components/chat/types";

type ChatWindowProps = {
  // 父页面负责管理消息状态，这个组件只负责把消息渲染出来。
  messages: ChatMessage[];
  isLoading: boolean;
  streamStatus: StreamStatus;
  streamError?: string;
  error?: string;
};

export function ChatWindow({
  messages,
  isLoading,
  streamStatus,
  streamError,
  error,
}: ChatWindowProps) {
  const isStreaming = streamStatus === "loading" || streamStatus === "streaming";
  const loadingLabel = isStreaming
    ? streamStatus === "loading"
      ? "正在建立连接"
      : "模型正在生成"
    : "正在加载消息";

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* 有消息时渲染消息列表，没有消息时展示空状态。 */}
          {messages.length === 0 ? (
            <EmptyState
              title="开始一次知识库问答"
              description="在底部输入问题。P4 会自动创建会话，并把用户消息和 AI 回复保存到 MySQL。"
            />
          ) : (
            messages.map((message) => (
              // key 使用稳定 id，帮助 React 正确追踪每一条消息。
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {/* 请求期间显示 loading，请求失败时显示错误提示。 */}
          {isLoading || isStreaming ? <Loading label={loadingLabel} /> : null}
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {streamStatus === "aborted" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              已停止生成，本次保留已生成的内容。
            </div>
          ) : null}
          {streamStatus === "error" ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {streamError || "模型生成失败，请稍后再试。"}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
