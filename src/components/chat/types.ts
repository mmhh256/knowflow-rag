export type {
  ChatMessage,
  Conversation,
  RetrievalStatus,
  SourceChunk,
} from "@/lib/types/chat";

export type StreamStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "done"
  | "error"
  | "aborted";
