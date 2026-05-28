export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: SourcePreview[];
};

export type Conversation = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
};

export type SourcePreview = {
  id: string;
  title: string;
  excerpt: string;
  score: string;
};
