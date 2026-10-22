import { Hono } from "hono";
import { prisma } from "../db.js";
import { runAgentTurn } from "./agent.service.js";
import type { AgentContext, AgentMessage } from "./types.js";

export const agentRouter = new Hono();

/**
 * POST /api/agent/chat
 *
 * Body:
 * ```json
 * {
 *   "conversationId": "uuid",
 *   "message": "I'd like to book a haircut"
 * }
 * ```
 *
 * The conversation must already exist in the DB.
 * Message history is loaded from the DB so the agent has full context.
 */
agentRouter.post("/chat", async (c) => {
  const body = await c.req.json<{
    conversationId: string;
    message: string;
  }>();

  const { conversationId, message } = body;

  if (!conversationId || !message?.trim()) {
    return c.json({ error: "conversationId and message are required." }, 400);
  }

  // Load conversation + contractor + customer for context.
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      contractor: { select: { id: true, name: true, timezone: true } },
      customer: { select: { id: true } },
      messages: {
        where: { role: { in: ["USER", "ASSISTANT"] } },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
    },
  });

  if (!conversation) {
    return c.json({ error: "Conversation not found." }, 404);
  }

  if (conversation.status === "CLOSED" || conversation.status === "HUMAN_HANDOFF") {
    return c.json(
      { error: `Conversation is ${conversation.status.toLowerCase()}.` },
      409,
    );
  }

  // Map DB messages to OpenAI format.
  const history: AgentMessage[] = conversation.messages.map((m) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }));

  const ctx: AgentContext = {
    contractorId: conversation.contractor.id,
    customerId: conversation.customer.id,
    conversationId,
    timezone: conversation.contractor.timezone,
    contractorName: conversation.contractor.name,
  };

  const result = await runAgentTurn(history, message, ctx);

  // Persist the user message and the agent reply.
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        role: "USER",
        content: message,
        channel: conversation.channel,
        latencyMs: null,
      },
    }),
    prisma.message.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: result.reply,
        channel: conversation.channel,
        latencyMs: result.latencyMs,
        costUsd: result.usage
          ? calculateCostUsd(result.usage)
          : null,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return c.json({
    reply: result.reply,
    humanHandoff: result.humanHandoff,
    latencyMs: result.latencyMs,
  });
});

/* ------------------------------------------------------------------ */
/*  Cost calculation helper                                              */
/* ------------------------------------------------------------------ */

/**
 * Estimates cost in USD for gpt-4.1-mini based on token usage.
 * Prices: $0.40 / 1M input tokens, $1.60 / 1M output tokens.
 */
function calculateCostUsd(usage: {
  prompt_tokens: number;
  completion_tokens: number;
}): number {
  const inputCost = (usage.prompt_tokens / 1_000_000) * 0.4;
  const outputCost = (usage.completion_tokens / 1_000_000) * 1.6;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
