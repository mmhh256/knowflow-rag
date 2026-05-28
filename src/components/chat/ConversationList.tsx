import type { Conversation } from "@/components/chat/types";

type ConversationListProps = {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <aside className="w-full border-b border-slate-200 bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">会话列表</h2>
          <p className="mt-1 text-xs text-slate-500">本地模拟会话</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          新建
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {conversations.map((conversation) => {
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
                {conversation.description}
              </div>
              <div
                className={`mt-2 text-xs ${
                  isActive ? "text-slate-300" : "text-slate-400"
                }`}
              >
                {conversation.updatedAt}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
