"use client";

import { useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatWindow } from "@/components/chat/ChatWindow";
import type {
  ChatMessage,
  SourcePreview,
} from "@/components/chat/types";
import { AppShell } from "@/components/layout/AppShell";

const mockSources: SourcePreview[] = [
  {
    id: "source-1",
    title: "产品需求说明.pdf",
    excerpt:
      "后续阶段会在这里展示检索命中的片段、页码、分块序号和相似度分数。",
    score: "0.91",
  },
  {
    id: "source-2",
    title: "团队手册.md",
    excerpt:
      "P1 阶段这里只是静态占位，不读取文件，也不执行真实检索。",
    score: "0.84",
  },
];

const initialMessages: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "你好，我是 P1 阶段的模拟助手。你可以输入一个问题，我会用前端本地状态生成一条模拟回复。",
    createdAt: "09:00",
    sources: mockSources,
  },
];

function createTimestamp() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function createMessageId(role: ChatMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSend() {
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

    window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: `这是针对“${question}”的本地模拟回复。P2 阶段这里会改为请求假后端接口，但 P1 只保留在前端状态中。`,
        createdAt: createTimestamp(),
        sources: mockSources,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
      setIsLoading(false);
    }, 600);
  }

  return (
    <AppShell>
      <div className="flex h-screen min-h-[720px] flex-col overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatWindow messages={messages} isLoading={isLoading} />
          <ChatInput
            value={input}
            isLoading={isLoading}
            onChange={setInput}
            onSend={handleSend}
          />
        </div>
      </div>
    </AppShell>
  );
}
