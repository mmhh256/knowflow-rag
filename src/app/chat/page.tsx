"use client";

import { useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AppShell } from "@/components/layout/AppShell";
import { request } from "@/lib/request";
import type { ChatMessage, ChatRequest, ChatResponse } from "@/lib/types/chat";

// 页面首次进入时展示一条欢迎消息，避免聊天区域完全空白。
const initialMessages: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "你好，我是 P3 阶段的 AI 助手。你可以输入一个问题，我会通过后端接口调用外部模型返回回答。",
    createdAt: "09:00",
  },
];

// 统一生成中文时间，保证用户消息和助手消息的显示格式一致。
function createTimestamp() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

// 用时间戳和随机片段生成前端临时 id，满足 React 列表渲染 key 的要求。
function createMessageId(role: ChatMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatPage() {
  // messages 是聊天页的核心状态，用户消息和助手消息都保存在这里。
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  // input 是受控输入框的值，ChatInput 只负责展示和触发变更。
  const [input, setInput] = useState("");
  // isLoading 用来控制按钮禁用和“正在生成”占位，防止重复提交。
  const [isLoading, setIsLoading] = useState(false);
  // error 保存接口失败后的提示文案，交给 ChatWindow 展示。
  const [error, setError] = useState("");

  async function handleSend() {
    const question = input.trim();
    if (!question || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: question,
      createdAt: createTimestamp(),
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      // 前端只关心 ChatRequest/ChatResponse，底层 fetch 细节交给 request 封装。
      const requestBody: ChatRequest = { question };
      const data = await request<ChatResponse>("/api/chat", {
        method: "POST",
        body: requestBody,
      });
      // 后端 answer 回来后，再组装成 assistant 消息追加到消息列表。
      const assistantMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: data.answer,
        createdAt: createTimestamp(),
        sources: data.sources,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
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
    <AppShell>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <ChatWindow messages={messages} isLoading={isLoading} error={error} />
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
