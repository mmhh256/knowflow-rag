import type { Conversation } from "@/components/chat/types";

type ConversationListProps = {
  // P4 开始，会话列表来自 MySQL，而不是前端写死的模拟数据。
  conversations: Conversation[];
  activeConversationId?: string;
  isLoading?: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading = false,
  onNewConversation,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">会话列表</h2>
          <p className="mt-1 text-xs text-slate-500">数据库持久化</p>
        </div>
        <button
          type="button"
          onClick={onNewConversation}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          新建
        </button>
      </div>

      <div className="mt-4 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            正在加载会话...
          </div>
        ) : null}

        {!isLoading && conversations.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-xs leading-5 text-slate-500">
            还没有会话。直接发送问题，后端会自动创建一个新会话。
          </div>
        ) : null}

        {conversations.map((conversation) => {
          // 当前会话用高亮样式，其他会话保持普通样式。
          const isActive = conversation.id === activeConversationId;

          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                isActive
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="truncate text-sm font-medium">
                {conversation.title}
              </div>
              <div
                className={`mt-1 line-clamp-2 text-xs leading-5 ${
                  isActive ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {new Date(conversation.updatedAt).toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
