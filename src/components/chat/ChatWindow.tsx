import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessage } from "@/components/chat/types";

type ChatWindowProps = {
  messages: ChatMessage[];
  isLoading: boolean;
};

export function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {messages.length === 0 ? (
            <EmptyState
              title="开始一次知识库问答"
              description="在底部输入问题。P1 会追加你的消息和一条模拟助手回复，不会调用任何后端服务。"
            />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {isLoading ? <Loading /> : null}
        </div>
      </div>
    </section>
  );
}
