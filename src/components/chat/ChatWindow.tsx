"use client";

import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessage, StreamStatus } from "@/components/chat/types";

type ChatWindowProps = {
  // 父页面负责管理消息状态，这个组件只负责渲染消息和控制聊天窗口滚动。
  messages: ChatMessage[];
  isLoading: boolean;
  streamStatus: StreamStatus;
  streamError?: string;
  error?: string;
};

function isNearBottom(element: HTMLDivElement) {
  const distanceToBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;

  return distanceToBottom < 80;
}

export function ChatWindow({
  messages,
  isLoading,
  streamStatus,
  streamError,
  error,
}: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoFollowRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const isStreaming = streamStatus === "loading" || streamStatus === "streaming";
  const loadingLabel = isStreaming
    ? streamStatus === "loading"
      ? "正在建立连接"
      : "模型正在生成"
    : "正在加载消息";

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const previousMessageCount = previousMessageCountRef.current;
    const messageCountChanged = messages.length !== previousMessageCount;
    const latestMessage = messages[messages.length - 1];

    previousMessageCountRef.current = messages.length;

    // 用户发送新问题、切换会话加载历史、或消息数量变化时，默认重新把视角拉到底部。
    // 这样新一轮回答开始时用户能直接看到最新问题和 AI 回复。
    if (messageCountChanged) {
      shouldAutoFollowRef.current = true;
    }

    // 如果用户在 AI 回答过程中手动滚动离开底部，shouldAutoFollowRef 会变成 false。
    // 后续 token 更新仍会重新渲染消息，但不会强行把用户拽回底部。
    if (shouldAutoFollowRef.current || latestMessage?.role === "user") {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: isStreaming ? "smooth" : "auto",
        });
      });
    }
  }, [messages, isLoading, isStreaming, error, streamError]);

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    // 用户滚动到上方阅读历史时，暂停自动跟随。
    // 如果用户自己滚回底部，则恢复自动跟随，继续看实时输出。
    shouldAutoFollowRef.current = isNearBottom(container);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto max-w-5xl space-y-6">
          {messages.length === 0 ? (
            <EmptyState
              title="开始一次知识库问答"
              description="在底部输入问题，系统会保存会话消息，并优先尝试使用知识库回答。"
            />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

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
