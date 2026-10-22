export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isError?: boolean;
  metadata?: {
    author?: string;
    staffUsername?: string;
    event?: string;
  } | null;
}

export interface CustomerProfile {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface SendMessageResponse {
  conversationId?: string;
  reply: string;
  humanHandoff: boolean;
  isStaffMode?: boolean;
  customer?: CustomerProfile;
  latencyMs: number;
}
