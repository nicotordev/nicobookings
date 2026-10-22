import type { ChatMessage, CustomerProfile, SendMessageResponse } from "../types/chat";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function sendChatMessage(
  conversationId: string,
  message: string,
  customerInfo?: CustomerProfile,
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      message,
      customerInfo,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
  }

  return response.json() as Promise<SendMessageResponse>;
}

export async function fetchConversationMessages(conversationId: string): Promise<{
  status: string;
  customer?: CustomerProfile;
  messages: ChatMessage[];
}> {
  const response = await fetch(`${API_BASE}/api/agent/conversation/${conversationId}/messages`);
  if (!response.ok) {
    return { status: "ACTIVE", messages: [] };
  }

  const data = (await response.json()) as {
    status: string;
    customer?: CustomerProfile;
    messages: Array<{
      id: string;
      role: "user" | "assistant" | "system";
      content: string;
      timestamp: string;
      metadata?: Record<string, unknown> | null;
    }>;
  };

  return {
    status: data.status,
    customer: data.customer,
    messages: (data.messages || []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      metadata: m.metadata,
    })),
  };
}
