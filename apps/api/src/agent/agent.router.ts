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
import { extractIdentityFromText, linkOrUpdateCustomer } from "./customer.service.js";

/**
 * GET /api/agent/conversation/:id/messages
 * Allows customer chat widget to fetch all messages and check status
 */
agentRouter.get("/conversation/:id/messages", async (c) => {
  const id = c.req.param("id");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return c.json({ messages: [], status: "ACTIVE", customer: null });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        where: { role: { in: ["USER", "ASSISTANT"] } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          metadata: true,
        },
      },
      customer: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!conversation) {
    return c.json({ messages: [], status: "ACTIVE", customer: null });
  }

  return c.json({
    status: conversation.status,
    customer: conversation.customer,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase(),
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      metadata: m.metadata,
    })),
  });
});

/**
 * POST /api/agent/chat
 */
agentRouter.post("/chat", async (c) => {
  const body = await c.req.json<{
    conversationId: string;
    message: string;
    customerInfo?: { name?: string; email?: string; phone?: string };
  }>();

  const { conversationId, message, customerInfo } = body;

  if (!conversationId || !message?.trim()) {
    return c.json({ error: "conversationId and message are required." }, 400);
  }

  // Load conversation + contractor + customer for context.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      conversationId,
    );

  let conversation = isUuid
    ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          contractor: { select: { id: true, name: true, timezone: true } },
          customer: { select: { id: true, name: true, email: true, phone: true } },
          messages: {
            where: { role: { in: ["USER", "ASSISTANT"] } },
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true },
          },
        },
      })
    : null;

  if (!conversation) {
    let contractor = await prisma.contractor.findFirst({
      select: { id: true, name: true, timezone: true },
    });

    if (!contractor) {
      contractor = await prisma.contractor.create({
        data: {
          name: "NicoBookings Studio",
          slug: "nicobookings",
          timezone: "America/Santiago",
          services: {
            create: [
              { name: "Haircut & Styling", priceCents: 2500, durationMins: 45 },
              { name: "Consultation", priceCents: 1500, durationMins: 30 },
            ],
          },
        },
        select: { id: true, name: true, timezone: true },
      });
    }

    const customer = await prisma.customer.create({
      data: {
        contractorId: contractor.id,
        name: customerInfo?.name?.trim() || "Guest Customer",
        email: customerInfo?.email?.trim().toLowerCase() || `guest_${Date.now()}@example.com`,
        phone: customerInfo?.phone?.trim() || null,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    conversation = await prisma.conversation.create({
      data: {
        contractorId: contractor.id,
        customerId: customer.id,
        channel: "WEB",
      },
      include: {
        contractor: { select: { id: true, name: true, timezone: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        messages: {
          where: { role: { in: ["USER", "ASSISTANT"] } },
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        },
      },
    });
  }

  // Seamless customer identification from message or body
  const extracted = extractIdentityFromText(message);
  const candidateIdentity = {
    name: customerInfo?.name || extracted.name,
    email: customerInfo?.email || extracted.email,
    phone: customerInfo?.phone || extracted.phone,
  };

  if (candidateIdentity.name || candidateIdentity.email || candidateIdentity.phone) {
    try {
      const updatedCust = await linkOrUpdateCustomer({
        contractorId: conversation.contractor.id,
        conversationId: conversation.id,
        currentCustomerId: conversation.customer.id,
        name: candidateIdentity.name,
        email: candidateIdentity.email,
        phone: candidateIdentity.phone,
      });
      if (updatedCust) {
        conversation.customer = updatedCust;
      }
    } catch (err) {
      console.warn("Frictionless identity resolution non-fatal warning:", err);
    }
  }

  // If conversation is closed
  if (conversation.status === "CLOSED") {
    return c.json({ error: "Conversation is closed." }, 409);
  }

  // If conversation is escalated to HUMAN_HANDOFF, save the user message and keep continuity!
  if (conversation.status === "HUMAN_HANDOFF") {
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: message,
          channel: conversation.channel,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return c.json({
      conversationId: conversation.id,
      reply: "Tu mensaje fue recibido por nuestro equipo de atención humana. Un especialista te responderá directamente aquí a la brevedad.",
      humanHandoff: true,
      isStaffMode: true,
      customer: conversation.customer,
      latencyMs: 15,
    });
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
        conversationId: conversation.id,
        role: "USER",
        content: message,
        channel: conversation.channel,
        latencyMs: null,
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversation.id,
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
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return c.json({
    conversationId: conversation.id,
    reply: result.reply,
    humanHandoff: result.humanHandoff,
    customer: conversation.customer,
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
