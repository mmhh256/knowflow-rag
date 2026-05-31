import { useState } from "react";
import type { Conversation } from "@/components/chat/types";

type ConversationListProps = {
  // P4 开始，会话列表来自 MySQL，而不是前端写死的模拟数据。
  conversations: Conversation[];
  activeConversationId?: string;
  isLoading?: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
};

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading = false,
  onNewConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string>();
  const [editingTitle, setEditingTitle] = useState("");
  const [busyId, setBusyId] = useState<string>();

  function startRename(conversation: Conversation) {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  }

  async function submitRename(conversationId: string) {
    const title = editingTitle.trim();
    if (!title) {
      return;
    }

    setBusyId(conversationId);
    try {
      await onRenameConversation(conversationId, title);
      setEditingId(undefined);
      setEditingTitle("");
    } finally {
      setBusyId(undefined);
    }
  }

  async function deleteConversation(conversation: Conversation) {
    const shouldDelete = window.confirm(
      `确定删除会话“${conversation.title}”吗？删除后该会话的历史消息也会一起删除。`,
    );
    if (!shouldDelete) {
      return;
    }

    setBusyId(conversation.id);
    try {
      await onDeleteConversation(conversation.id);
    } finally {
      setBusyId(undefined);
    }
  }

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
          const isEditing = editingId === conversation.id;
          const isBusy = busyId === conversation.id;

          return (
            <div
              key={conversation.id}
              className={`rounded-lg border p-3 transition ${
                isActive
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void submitRename(conversation.id);
                      }
                      if (event.key === "Escape") {
                        setEditingId(undefined);
                        setEditingTitle("");
                      }
                    }}
                    autoFocus
                    maxLength={40}
                    className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isBusy || !editingTitle.trim()}
                      onClick={() => void submitRename(conversation.id)}
                      className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setEditingId(undefined);
                        setEditingTitle("");
                      }}
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${
                        isActive
                          ? "border-slate-600 text-slate-200"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className="block w-full text-left"
                  >
                    <div className="truncate text-sm font-medium">
                      {conversation.title}
                    </div>
                    <div
                      className={`mt-1 line-clamp-2 text-xs leading-5 ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {new Date(conversation.updatedAt).toLocaleString(
                        "zh-CN",
                        {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </div>
                  </button>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => startRename(conversation)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isActive
                          ? "border-slate-600 text-slate-200 hover:bg-slate-800"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      重命名
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void deleteConversation(conversation)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isActive
                          ? "border-red-300 text-red-100 hover:bg-red-500/20"
                          : "border-red-100 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
