import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth/auth.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const adminRouter = new Hono<{ Variables: JwtVariables }>();

// Protect all admin endpoints with JWT cookie authentication
adminRouter.use("*", requireAdmin);

/**
 * Helper to ensure a contractor exists for querying/seeding
 */
async function getOrCreateContractor() {
  const existing = await prisma.contractor.findFirst({
    select: { id: true, name: true, timezone: true },
  });

  if (existing) return existing;

  return prisma.contractor.create({
    data: {
      name: "NicoBookings Studio",
      slug: "nicobookings",
      timezone: "America/Santiago",
      services: {
        create: [
          { name: "Haircut & Styling", priceCents: 2500, durationMins: 45 },
          { name: "Consultation", priceCents: 1500, durationMins: 30 },
          { name: "Facial Care Treatment", priceCents: 3500, durationMins: 60 },
          { name: "Follow-up Session", priceCents: 2000, durationMins: 30 },
        ],
      },
    },
    select: { id: true, name: true, timezone: true },
  });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatBookingDateTime(date: Date, timezone = "America/Santiago"): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * GET /api/admin/overview
 * Returns dashboard metrics and recent bookings
 */
adminRouter.get("/overview", async (c) => {
  try {
    const contractor = await getOrCreateContractor();

    const [
      totalBookings,
      totalCustomers,
      pendingBookings,
      openHandoffs,
      revenueBookings,
      recentBookingsRaw,
    ] = await Promise.all([
      prisma.booking.count({ where: { contractorId: contractor.id } }),
      prisma.customer.count({ where: { contractorId: contractor.id } }),
      prisma.booking.count({
        where: { contractorId: contractor.id, status: "PENDING" },
      }),
      prisma.humanHandoff.count({
        where: { contractorId: contractor.id, status: "OPEN" },
      }),
      prisma.booking.findMany({
        where: {
          contractorId: contractor.id,
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
        select: {
          service: { select: { priceCents: true } },
        },
      }),
      prisma.booking.findMany({
        where: { contractorId: contractor.id },
        orderBy: { startsAt: "desc" },
        take: 10,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          service: { select: { id: true, name: true, priceCents: true } },
        },
      }),
    ]);

    const totalRevenueCents = revenueBookings.reduce(
      (sum, b) => sum + (b.service.priceCents ?? 0),
      0,
    );

    const recentBookings = recentBookingsRaw.map((b) => ({
      id: b.id,
      customerName: b.customer?.name ?? "Guest Customer",
      customerEmail: b.customer?.email ?? "N/A",
      customerPhone: b.customer?.phone ?? "N/A",
      serviceName: b.service?.name ?? "General Service",
      dateTime: formatBookingDateTime(b.startsAt, contractor.timezone),
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
      amount: formatCurrency(b.service?.priceCents ?? 0),
      notes: b.notes,
    }));

    return c.json({
      metrics: {
        totalBookings,
        totalRevenue: totalRevenueCents / 100,
        totalRevenueFormatted: formatCurrency(totalRevenueCents),
        totalCustomers,
        pendingRequests: pendingBookings + openHandoffs,
      },
      recentBookings,
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    return c.json({ error: "Failed to load admin overview." }, 500);
  }
});

/**
 * GET /api/admin/bookings
 * Returns bookings list with optional filtering and search
 */
adminRouter.get("/bookings", async (c) => {
  try {
    const contractor = await getOrCreateContractor();
    const statusParam = c.req.query("status");
    const searchParam = c.req.query("search")?.toLowerCase().trim();

    const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
    const statusFilter =
      statusParam && validStatuses.includes(statusParam.toUpperCase())
        ? (statusParam.toUpperCase() as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW")
        : undefined;

    const bookingsRaw = await prisma.booking.findMany({
      where: {
        contractorId: contractor.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { startsAt: "desc" },
      take: 100,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, priceCents: true, durationMins: true } },
      },
    });

    let bookings = bookingsRaw.map((b) => ({
      id: b.id,
      customerName: b.customer?.name ?? "Guest Customer",
      customerEmail: b.customer?.email ?? "",
      customerPhone: b.customer?.phone ?? "",
      serviceName: b.service?.name ?? "General Service",
      servicePriceCents: b.service?.priceCents ?? 0,
      durationMins: b.service?.durationMins ?? 60,
      dateTime: formatBookingDateTime(b.startsAt, contractor.timezone),
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
      amount: formatCurrency(b.service?.priceCents ?? 0),
      notes: b.notes ?? "",
      createdAt: b.createdAt.toISOString(),
    }));

    if (searchParam) {
      bookings = bookings.filter(
        (b) =>
          b.customerName.toLowerCase().includes(searchParam) ||
          b.customerEmail.toLowerCase().includes(searchParam) ||
          b.customerPhone.toLowerCase().includes(searchParam) ||
          b.serviceName.toLowerCase().includes(searchParam) ||
          b.notes.toLowerCase().includes(searchParam),
      );
    }

    return c.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return c.json({ error: "Failed to fetch bookings." }, 500);
  }
});

/**
 * PATCH /api/admin/bookings/:id
 * Update booking status and notes
 */
adminRouter.patch("/bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid booking ID format." }, 400);
    }

    const body = await c.req.json<{
      status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
      notes?: string;
    }>();

    const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
    if (body.status && !validStatuses.includes(body.status)) {
      return c.json({ error: "Invalid booking status." }, 400);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
      },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        service: { select: { name: true, priceCents: true } },
      },
    });

    return c.json({
      booking: {
        id: updated.id,
        customerName: updated.customer?.name ?? "Guest Customer",
        customerEmail: updated.customer?.email ?? "",
        serviceName: updated.service?.name ?? "",
        status: updated.status,
        notes: updated.notes,
        amount: formatCurrency(updated.service?.priceCents ?? 0),
        startsAt: updated.startsAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return c.json({ error: "Failed to update booking." }, 500);
  }
});

/**
 * GET /api/admin/customers
 * Returns all customers with booking statistics
 */
adminRouter.get("/customers", async (c) => {
  try {
    const contractor = await getOrCreateContractor();
    const searchParam = c.req.query("search")?.toLowerCase().trim();

    const customersRaw = await prisma.customer.findMany({
      where: { contractorId: contractor.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true, status: true },
        },
      },
    });

    let customers = customersRaw.map((cust) => ({
      id: cust.id,
      name: cust.name || "Unnamed Customer",
      email: cust.email || "No email",
      phone: cust.phone || "No phone",
      totalBookings: cust._count.bookings,
      lastBookingAt: cust.bookings[0]?.startsAt ? cust.bookings[0].startsAt.toISOString() : null,
      createdAt: cust.createdAt.toISOString(),
    }));

    if (searchParam) {
      customers = customers.filter(
        (cust) =>
          cust.name.toLowerCase().includes(searchParam) ||
          cust.email.toLowerCase().includes(searchParam) ||
          cust.phone.toLowerCase().includes(searchParam),
      );
    }

    return c.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return c.json({ error: "Failed to fetch customers." }, 500);
  }
});

/**
 * GET /api/admin/services
 * Returns all services for the contractor
 */
adminRouter.get("/services", async (c) => {
  try {
    const contractor = await getOrCreateContractor();

    const services = await prisma.service.findMany({
      where: { contractorId: contractor.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    return c.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        priceCents: s.priceCents ?? 0,
        amount: formatCurrency(s.priceCents ?? 0),
        durationMins: s.durationMins,
        isActive: s.isActive,
        totalBookings: s._count.bookings,
      })),
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return c.json({ error: "Failed to fetch services." }, 500);
  }
});

/**
 * POST /api/admin/services
 * Create a new service
 */
adminRouter.post("/services", async (c) => {
  try {
    const contractor = await getOrCreateContractor();
    const body = await c.req.json<{
      name: string;
      description?: string;
      priceCents: number;
      durationMins: number;
    }>();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return c.json({ error: "Service name is required." }, 400);
    }

    const priceCents = typeof body.priceCents === "number" && body.priceCents >= 0 ? body.priceCents : 0;
    const durationMins = typeof body.durationMins === "number" && body.durationMins > 0 ? body.durationMins : 60;

    const newService = await prisma.service.create({
      data: {
        contractorId: contractor.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        priceCents,
        durationMins,
        isActive: true,
      },
    });

    return c.json(
      {
        service: {
          id: newService.id,
          name: newService.name,
          description: newService.description || "",
          priceCents: newService.priceCents ?? 0,
          amount: formatCurrency(newService.priceCents ?? 0),
          durationMins: newService.durationMins,
          isActive: newService.isActive,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Error creating service:", error);
    return c.json({ error: "Failed to create service. Make sure the name is unique." }, 500);
  }
});

/**
 * PATCH /api/admin/services/:id
 * Update service details or toggle isActive
 */
adminRouter.patch("/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid service ID format." }, 400);
    }

    const body = await c.req.json<{
      name?: string;
      description?: string;
      priceCents?: number;
      durationMins?: number;
      isActive?: boolean;
    }>();

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
        ...(typeof body.priceCents === "number" && body.priceCents >= 0 ? { priceCents: body.priceCents } : {}),
        ...(typeof body.durationMins === "number" && body.durationMins > 0 ? { durationMins: body.durationMins } : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      },
    });

    return c.json({
      service: {
        id: updated.id,
        name: updated.name,
        description: updated.description || "",
        priceCents: updated.priceCents ?? 0,
        amount: formatCurrency(updated.priceCents ?? 0),
        durationMins: updated.durationMins,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return c.json({ error: "Failed to update service." }, 500);
  }
});

/**
 * DELETE /api/admin/services/:id
 * Toggle service active status to false (soft-delete safe)
 */
adminRouter.delete("/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid service ID format." }, 400);
    }

    await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    return c.json({ success: true, message: "Service deactivated." });
  } catch (error) {
    console.error("Error deactivating service:", error);
    return c.json({ error: "Failed to deactivate service." }, 500);
  }
});

/**
 * GET /api/admin/handoffs
 * Returns human handoff requests
 */
adminRouter.get("/handoffs", async (c) => {
  try {
    const contractor = await getOrCreateContractor();
    const statusParam = c.req.query("status");

    const validStatuses = ["OPEN", "ASSIGNED", "RESOLVED"];
    const statusFilter =
      statusParam && validStatuses.includes(statusParam.toUpperCase())
        ? (statusParam.toUpperCase() as "OPEN" | "ASSIGNED" | "RESOLVED")
        : undefined;

    const handoffs = await prisma.humanHandoff.findMany({
      where: {
        contractorId: contractor.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        conversation: {
          select: {
            id: true,
            summary: true,
            channel: true,
            customer: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    return c.json({
      handoffs: handoffs.map((h) => ({
        id: h.id,
        conversationId: h.conversationId,
        customerName: h.conversation.customer?.name ?? "Customer",
        customerEmail: h.conversation.customer?.email ?? "N/A",
        customerPhone: h.conversation.customer?.phone ?? "N/A",
        channel: h.conversation.channel,
        reason: h.reason,
        status: h.status,
        assignedTo: h.assignedTo || null,
        notes: h.notes || "",
        createdAt: h.createdAt.toISOString(),
        resolvedAt: h.resolvedAt ? h.resolvedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching handoffs:", error);
    return c.json({ error: "Failed to fetch handoffs." }, 500);
  }
});

/**
 * PATCH /api/admin/handoffs/:id
 * Update handoff status, assign, or add notes
 */
adminRouter.patch("/handoffs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid handoff ID format." }, 400);
    }

    const body = await c.req.json<{
      status?: "OPEN" | "ASSIGNED" | "RESOLVED";
      notes?: string;
      assignedTo?: string;
    }>();

    const validStatuses = ["OPEN", "ASSIGNED", "RESOLVED"];
    if (body.status && !validStatuses.includes(body.status)) {
      return c.json({ error: "Invalid handoff status." }, 400);
    }

    const updated = await prisma.humanHandoff.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
        ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
        ...(typeof body.assignedTo === "string" ? { assignedTo: body.assignedTo } : {}),
      },
    });

    return c.json({ handoff: updated });
  } catch (error) {
    console.error("Error updating handoff:", error);
    return c.json({ error: "Failed to update handoff." }, 500);
  }
});

/**
 * GET /api/admin/conversations/:id
 * Retrieve full message thread and metadata for a conversation
 */
adminRouter.get("/conversations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid conversation ID format." }, 400);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        handoffs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            channel: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return c.json({ error: "Conversation not found." }, 404);
    }

    return c.json({
      conversation: {
        id: conversation.id,
        status: conversation.status,
        channel: conversation.channel,
        summary: conversation.summary,
        handoffReason: conversation.handoffReason,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        customer: {
          id: conversation.customer.id,
          name: conversation.customer.name ?? "Guest Customer",
          email: conversation.customer.email ?? "N/A",
          phone: conversation.customer.phone ?? "N/A",
        },
        activeHandoff: conversation.handoffs[0] ?? null,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content,
          metadata: m.metadata,
          timestamp: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    return c.json({ error: "Failed to fetch conversation details." }, 500);
  }
});

/**
 * POST /api/admin/conversations/:id/reply
 * Send a reply from a human staff agent into the conversation thread
 */
adminRouter.post("/conversations/:id/reply", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid conversation ID format." }, 400);
    }

    const body = await c.req.json<{ message: string }>();
    if (!body.message || !body.message.trim()) {
      return c.json({ error: "Message content is required." }, 400);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        handoffs: {
          where: { status: { in: ["OPEN", "ASSIGNED"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!conversation) {
      return c.json({ error: "Conversation not found." }, 404);
    }

    const payload = c.get("jwtPayload") as { username?: string } | undefined;
    const staffUsername = payload?.username ?? "Support Specialist";

    // 1. Create message from human agent
    const createdMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: body.message.trim(),
        channel: conversation.channel,
        metadata: {
          author: "staff",
          staffUsername,
        },
      },
    });

    // 2. Automatically mark handoff as ASSIGNED to this staff member if open
    const openHandoff = conversation.handoffs[0];
    if (openHandoff && openHandoff.status === "OPEN") {
      await prisma.humanHandoff.update({
        where: { id: openHandoff.id },
        data: {
          status: "ASSIGNED",
          assignedTo: staffUsername,
        },
      });
    }

    // 3. Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return c.json({
      message: {
        id: createdMessage.id,
        role: "assistant",
        content: createdMessage.content,
        timestamp: createdMessage.createdAt.toISOString(),
        metadata: createdMessage.metadata,
      },
    });
  } catch (error) {
    console.error("Error posting admin reply:", error);
    return c.json({ error: "Failed to send reply." }, 500);
  }
});

/**
 * POST /api/admin/conversations/:id/take
 * Take / assign a conversation to the current admin
 */
adminRouter.post("/conversations/:id/take", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid conversation ID format." }, 400);
    }

    const payload = c.get("jwtPayload") as { username?: string } | undefined;
    const staffUsername = payload?.username ?? "Support Specialist";

    const handoff = await prisma.humanHandoff.findFirst({
      where: {
        conversationId: id,
        status: { in: ["OPEN", "ASSIGNED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (handoff) {
      await prisma.humanHandoff.update({
        where: { id: handoff.id },
        data: {
          status: "ASSIGNED",
          assignedTo: staffUsername,
        },
      });
    }

    return c.json({ success: true, assignedTo: staffUsername });
  } catch (error) {
    console.error("Error taking conversation:", error);
    return c.json({ error: "Failed to take conversation." }, 500);
  }
});

/**
 * POST /api/admin/conversations/:id/resolve
 * Mark the handoff resolved and resume AI availability
 */
adminRouter.post("/conversations/:id/resolve", async (c) => {
  try {
    const id = c.req.param("id");
    if (!UUID_REGEX.test(id)) {
      return c.json({ error: "Invalid conversation ID format." }, 400);
    }

    const body = await c.req.json<{ staffNotes?: string }>().catch(() => ({ staffNotes: undefined }));

    const handoffs = await prisma.humanHandoff.findMany({
      where: {
        conversationId: id,
        status: { in: ["OPEN", "ASSIGNED"] },
      },
    });

    for (const h of handoffs) {
      await prisma.humanHandoff.update({
        where: { id: h.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          notes: body.staffNotes ? body.staffNotes : h.notes,
        },
      });
    }

    // Set conversation back to ACTIVE
    await prisma.conversation.update({
      where: { id },
      data: {
        status: "ACTIVE",
      },
    });

    // Add a resolution note into the chat thread
    await prisma.message.create({
      data: {
        conversationId: id,
        role: "ASSISTANT",
        content: "Esta consulta ha sido marcada como resuelta por nuestro equipo. ¡El asistente virtual vuelve a estar disponible para ayudarte!",
        channel: "WEB",
        metadata: {
          author: "system",
          event: "handoff_resolved",
        },
      },
    });

    return c.json({ success: true, status: "RESOLVED" });
  } catch (error) {
    console.error("Error resolving conversation:", error);
    return c.json({ error: "Failed to resolve conversation." }, 500);
  }
});
