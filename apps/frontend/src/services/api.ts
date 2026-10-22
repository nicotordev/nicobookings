import type { SendMessageResponse } from "../types/chat";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function sendChatMessage(
  conversationId: string,
  message: string,
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
  }

  return response.json() as Promise<SendMessageResponse>;
}
