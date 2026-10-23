import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

export type BookingSnapshot = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startsAt: string;
  notes: string | null;
};

export type ConversationSnapshot = {
  id: string;
  status: string;
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    bookings: BookingSnapshot[];
  };
  bookings: BookingSnapshot[];
  handoffs: Array<{ id: string; status: string; reason: string }>;
  contractor: {
    timezone: string;
    services: Array<{ name: string; priceCents: number | null }>;
  };
};

export function readSnapshot(conversationId: string): ConversationSnapshot {
  const output = execFileSync("bun", ["e2e/query.ts", "snapshot", conversationId], {
    cwd: root,
    encoding: "utf8",
  });
  const parsed = JSON.parse(output) as ConversationSnapshot | null;
  if (!parsed) {
    throw new Error(`Conversation ${conversationId} was not created.`);
  }
  return parsed;
}

export function readService(name: string): {
  name: string;
  priceCents: number | null;
  isActive: boolean;
} | null {
  const output = execFileSync("bun", ["e2e/query.ts", "service", name], {
    cwd: root,
    encoding: "utf8",
  });
  return JSON.parse(output) as {
    name: string;
    priceCents: number | null;
    isActive: boolean;
  } | null;
}

const replies = (page: Page) =>
  page.locator('[data-testid="message-assistant"], [data-testid="message-staff"]');

export async function waitForReply(page: Page, previousCount: number): Promise<string> {
  const thread = replies(page);
  await expect(thread).toHaveCount(previousCount + 1, { timeout: 120_000 });
  await expect(page.getByTestId("chat-pending")).toHaveCount(0);
  const content = (await thread.nth(previousCount).innerText()).replace(/\s+/g, " ").trim();
  if (content.startsWith("Error:")) {
    throw new Error(content);
  }
  return content;
}

export async function sendChat(page: Page, text: string): Promise<string> {
  const before = await replies(page).count();
  await page.getByTestId("chat-input").fill(text);
  await page.getByTestId("chat-send").click();
  return waitForReply(page, before);
}

const SPANISH_WORD =
  /\b(el|la|los|las|una|unos|para|por|con|gracias|quieres|horario|reserva|disponibilidad|minutos|ofrecemos|siguientes|gustaría|gustaria|cita|hola)\b/gi;

export function looksSpanish(text: string): boolean {
  return /[áéíóúñ¿¡]/i.test(text) || (text.match(SPANISH_WORD)?.length ?? 0) >= 3;
}

export async function conversationId(page: Page): Promise<string> {
  const id = await page.evaluate(() => localStorage.getItem("nicobookings_conversation_id"));
  if (!id) throw new Error("The chat did not store a conversation id.");
  return id;
}
