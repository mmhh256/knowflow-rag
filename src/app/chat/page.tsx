"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ConversationList } from "@/components/chat/ConversationList";
import { AppShell } from "@/components/layout/AppShell";
import { request } from "@/lib/request";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Conversation,
} from "@/lib/types/chat";

type ConversationsResponse = {
  conversations: Conversation[];
};

type MessagesResponse = {
  messages: ChatMessage[];
};

// 统一生成中文时间，保证用户消息和助手消息的显示格式一致。
function createTimestamp() {
  return new Date().toISOString();
}

// 用时间戳和随机片段生成前端临时 id，满足 React 列表渲染 key 的要求。
function createMessageId(role: ChatMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatPage() {
  // conversations 来自 GET /api/conversations，刷新页面后会重新从数据库加载。
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // 当前会话 id 决定发送消息时要保存到哪个 Conversation。
  const [activeConversationId, setActiveConversationId] = useState<string>();
  // messages 是聊天页的核心状态，用户消息和助手消息都保存在这里。
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // input 是受控输入框的值，ChatInput 只负责展示和触发变更。
  const [input, setInput] = useState("");
  // isLoading 用来控制按钮禁用和“正在生成”占位，防止重复提交。
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  // error 保存接口失败后的提示文案，交给 ChatWindow 展示。
  const [error, setError] = useState("");

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    setError("");

    try {
      const data = await request<MessagesResponse>(
        `/api/conversations/${conversationId}/messages`,
      );
      setMessages(data.messages);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "读取消息失败";
      setError(message);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const loadConversations = useCallback(async (selectFirst = false) => {
    setIsLoadingConversations(true);
    setError("");

    try {
      const data = await request<ConversationsResponse>("/api/conversations");
      setConversations(data.conversations);

      if (selectFirst && data.conversations.length > 0) {
        const firstConversation = data.conversations[0];
        setActiveConversationId(firstConversation.id);
        await loadMessages(firstConversation.id);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "读取会话失败";
      setError(message);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [loadMessages]);

  // 页面首次打开时加载会话列表；如果已有会话，就自动打开最近更新的一个。
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConversations(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  async function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    await loadMessages(conversationId);
  }

  async function handleNewConversation() {
    setError("");

    try {
      const data = await request<{ conversation: Conversation }>(
        "/api/conversations",
        {
          method: "POST",
          body: { title: "新会话" },
        },
      );
      setConversations((currentConversations) => [
        data.conversation,
        ...currentConversations,
      ]);
      setActiveConversationId(data.conversation.id);
      setMessages([]);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "创建会话失败";
      setError(message);
    }
  }

  async function handleSend() {
    const question = input.trim();
    if (!question || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: question,
      conversationId: activeConversationId ?? "pending",
      createdAt: createTimestamp(),
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      // 前端只关心 ChatRequest/ChatResponse，底层 fetch 细节交给 request 封装。
      const requestBody: ChatRequest = {
        question,
        conversationId: activeConversationId,
      };
      const data = await request<ChatResponse>("/api/chat", {
        method: "POST",
        body: requestBody,
      });
      // 后端 answer 回来后，再组装成 assistant 消息追加到消息列表。
      const assistantMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        conversationId: data.conversationId,
        content: data.answer,
        createdAt: createTimestamp(),
        sources: data.sources,
        answerMode: data.answerMode,
        retrievalStatus: data.retrievalStatus,
        fallbackReason: data.fallbackReason,
      };

      setMessages((currentMessages) => [
        ...currentMessages.map((message) =>
          message.conversationId === "pending"
            ? { ...message, conversationId: data.conversationId }
            : message,
        ),
        assistantMessage,
      ]);
      setActiveConversationId(data.conversationId);
      await loadConversations(false);
    } catch (requestError) {
      // request.ts 会把非 2xx 响应转成 Error，这里只负责把错误展示出来。
      const message =
        requestError instanceof Error ? requestError.message : "聊天请求失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell
      sidebarContent={
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConversations}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
        />
      }
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <ChatWindow
          messages={messages}
          isLoading={isLoading || isLoadingMessages}
          error={error}
        />
        <ChatInput
          value={input}
          isLoading={isLoading}
          onChange={setInput}
          onSend={handleSend}
        />
      </div>
    </AppShell>
  );
}
