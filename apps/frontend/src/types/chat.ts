export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export interface SendMessageResponse {
  conversationId?: string;
  reply: string;
  humanHandoff: boolean;
  latencyMs: number;
}
