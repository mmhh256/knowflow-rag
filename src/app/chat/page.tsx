"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ConversationList } from "@/components/chat/ConversationList";
import { AppShell } from "@/components/layout/AppShell";
import { request } from "@/lib/request";
import type {
  ChatStreamDone,
  ChatStreamMeta,
  ChatStreamRequest,
  Conversation,
} from "@/lib/types/chat";
import type { ChatMessage, StreamStatus } from "@/components/chat/types";

type ConversationsResponse = {
  conversations: Conversation[];
};

type MessagesResponse = {
  messages: ChatMessage[];
};

type SseEvent = {
  event: string;
  data: string;
};

// 统一生成中文时间，保证用户消息和助手消息的显示格式一致。
function createTimestamp() {
  return new Date().toISOString();
}

// 用时间戳和随机片段生成前端临时 id，满足 React 列表渲染 key 的要求。
function createMessageId(role: ChatMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSseEvent(raw: string): SseEvent | null {
  const lines = raw.split("\n").filter(Boolean);
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.replace("event:", "").trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.replace("data:", "").trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    event,
    data: dataLines.join("\n"),
  };
}

async function readStreamError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `请求失败：${response.status}`;
  } catch {
    return `请求失败：${response.status}`;
  }
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
  // 流式输出能让用户边看边等，减少“空等一整段回答”的焦虑感。
  // streamStatus 记录流式输出状态，控制按钮、提示文案和 UI 状态切换。
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [streamError, setStreamError] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  // error 保存接口失败后的提示文案，交给 ChatWindow 展示。
  const [error, setError] = useState("");

  // AbortController 用来中断 fetch 请求，停止流式生成。
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

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
    // conversationId 是多轮上下文的边界。切换会话前先停止当前流式生成，
    // 避免 A 会话的 token 继续写进 B 会话的消息列表。
    abortControllerRef.current?.abort();
    setActiveConversationId(conversationId);
    setStreamStatus("idle");
    setStreamError("");
    streamingMessageIdRef.current = null;
    await loadMessages(conversationId);
  }

  async function handleNewConversation() {
    // 新建会话时也要清理旧的临时流式状态，不让旧会话上下文影响新会话。
    abortControllerRef.current?.abort();
    setError("");
    setStreamStatus("idle");
    setStreamError("");
    streamingMessageIdRef.current = null;

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
    if (
      !question ||
      streamStatus === "loading" ||
      streamStatus === "streaming"
    ) {
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
    setStreamStatus("loading");
    setStreamError("");
    setError("");

    // AbortController 用来在前端主动中断请求，模拟“停止生成”。
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    streamingMessageIdRef.current = null;

    try {
      // SSE 流式接口不适合复用 request()，因为它会直接 res.json()。
      const requestBody: ChatStreamRequest = {
        question,
        conversationId: activeConversationId,
      };
      // fetch 能直接读取 ReadableStream；axios 默认会缓冲完整响应，不适合流式 token。
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await readStreamError(response));
      }

      if (!response.body) {
        throw new Error("浏览器未返回可读取的流式响应");
      }

      // response.body.getReader() 让我们逐块读取流式响应。
      const reader = response.body.getReader();
      // TextDecoder 负责把 Uint8Array 字节流转换成字符串。
      const decoder = new TextDecoder();
      let buffer = "";

      // response.body.getReader() 让我们能逐段读取 SSE 数据。
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const parsed = parseSseEvent(rawEvent);
          if (!parsed) {
            continue;
          }

          if (parsed.event === "meta") {
            const meta = JSON.parse(parsed.data) as ChatStreamMeta;
            const assistantId = createMessageId("assistant");
            streamingMessageIdRef.current = assistantId;

            setMessages((currentMessages) => [
              ...currentMessages.map((message) =>
                message.conversationId === "pending"
                  ? { ...message, conversationId: meta.conversationId }
                  : message,
              ),
              {
                id: assistantId,
                role: "assistant",
                conversationId: meta.conversationId,
                content: "",
                createdAt: createTimestamp(),
                sources: meta.sources,
                answerMode: meta.answerMode,
                retrievalStatus: meta.retrievalStatus,
                fallbackReason: meta.fallbackReason,
                rewrittenQuestion: meta.rewrittenQuestion,
                judgeReason: meta.judgeReason,
              },
            ]);

            setActiveConversationId(meta.conversationId);
            // loading -> streaming：收到 meta 后开始真正展示流式输出。
            setStreamStatus("streaming");
          }

          if (parsed.event === "token") {
            const payload = JSON.parse(parsed.data) as { content?: string };
            const token = payload.content ?? "";
            if (!token) {
              continue;
            }

            // token 会逐步追加到 assistant 消息的 content，形成实时输出效果。
            setMessages((currentMessages) =>
              currentMessages.map((message) =>
                message.id === streamingMessageIdRef.current
                  ? { ...message, content: `${message.content}${token}` }
                  : message,
              ),
            );
          }

          if (parsed.event === "done") {
            const payload = JSON.parse(parsed.data) as ChatStreamDone;

            setMessages((currentMessages) =>
              currentMessages.map((message) =>
                message.id === streamingMessageIdRef.current
                  ? {
                      ...message,
                      id: payload.messageId,
                      content: payload.answer || message.content,
                    }
                  : message,
              ),
            );

            // streaming -> done：后端已保存完整 assistant 消息。
            setStreamStatus("done");
            streamingMessageIdRef.current = null;
            void loadConversations(false);
          }

          if (parsed.event === "error") {
            const payload = JSON.parse(parsed.data) as { message?: string };
            setStreamError(payload.message ?? "模型生成失败，请稍后再试。");
            // streaming -> error：显示错误提示，允许用户继续提问。
            setStreamStatus("error");
          }
        }
      }
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        // aborted：前端主动停止，保留已生成内容。
        setStreamStatus("aborted");
        return;
      }

      const message =
        requestError instanceof Error ? requestError.message : "聊天请求失败";
      setStreamError(message);
      setStreamStatus("error");
    } finally {
      abortControllerRef.current = null;
    }
  }

  function handleAbort() {
    abortControllerRef.current?.abort();
    setStreamStatus("aborted");
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
          isLoading={isLoadingMessages}
          streamStatus={streamStatus}
          streamError={streamError}
          error={error}
        />
        <ChatInput
          value={input}
          streamStatus={streamStatus}
          onChange={setInput}
          onSend={handleSend}
          onAbort={handleAbort}
        />
      </div>
    </AppShell>
  );
}
