export type { ChatMessage, SourceChunk } from "@/lib/types/chat";

// Conversation 目前只用于前端侧边栏模拟数据，后续可以接真实会话表。
export type Conversation = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
};
