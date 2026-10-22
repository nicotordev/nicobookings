export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export interface SendMessageResponse {
  reply: string;
  humanHandoff: boolean;
  latencyMs: number;
}
