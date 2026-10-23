import { prisma } from "../../db.js";
import type { BookingStatus, HandoffStatus } from "../../generated/prisma/enums.js";
import { isUniqueConstraintError } from "../customer.identity.js";
import { linkOrUpdateCustomer } from "../customer.service.js";
import {
  buildAvailableSlots,
  formatLocal,
  isInsideBusinessHours,
  searchWindow,
} from "./slots.js";

const DEFAULT_TIMEZONE = "America/Santiago";

async function contractorTimezone(contractorId: string): Promise<string> {
  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { timezone: true },
  });
  return contractor?.timezone || DEFAULT_TIMEZONE;
}

/* ------------------------------------------------------------------ */
/*  list_services                                                        */
/* ------------------------------------------------------------------ */

async function resolveService(contractorId: string, serviceId: string, serviceName: string) {
  const select = { id: true, name: true, durationMins: true } as const;
  if (serviceId) {
    const byId = await prisma.service.findFirst({
      where: { id: serviceId, contractorId, isActive: true },
      select,
    });
    if (byId) return byId;
  }
  const name = serviceName.trim();
  if (!name) return null;
  return prisma.service.findFirst({
    where: { contractorId, isActive: true, name: { equals: name, mode: "insensitive" } },
    select,
  });
}

export async function listServices(contractorId: string) {
  const services = await prisma.service.findMany({
    where: { contractorId, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      durationMins: true,
    },
    orderBy: { name: "asc" },
  });

  return { services };
}

/* ------------------------------------------------------------------ */
/*  get_availability                                                     */
/* ------------------------------------------------------------------ */

export async function getAvailability(
  contractorId: string,
  serviceId: string,
  serviceName: string,
  dateFrom: string,
  dateTo: string,
) {
  const service = await resolveService(contractorId, serviceId, serviceName);

  if (!service) {
    return { error: "Service not found or inactive. Pass the exact service name from list_services." };
  }

  const requestedFrom = new Date(dateFrom);
  const requestedTo = new Date(dateTo);
  if (Number.isNaN(requestedFrom.getTime()) || Number.isNaN(requestedTo.getTime()) || requestedTo <= requestedFrom) {
    return { error: "dateFrom and dateTo must be a valid range." };
  }

  const timeZone = await contractorTimezone(contractorId);
  const window = searchWindow(requestedFrom, requestedTo, timeZone);

  const existingBookings = await prisma.booking.findMany({
    where: {
      contractorId,
      serviceId: service.id,
      status: { in: ["PENDING", "CONFIRMED"] as BookingStatus[] },
      startsAt: { lte: window.dateTo },
      endsAt: { gte: window.dateFrom },
    },
    select: { startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });

  return {
    timezone: timeZone,
    businessHours: "09:00-18:00",
    service: { id: service.id, name: service.name, durationMins: service.durationMins },
    availableSlots: buildAvailableSlots({
      timeZone,
      durationMins: service.durationMins,
      dateFrom: window.dateFrom,
      dateTo: window.dateTo,
      busy: existingBookings,
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  create_booking                                                       */
/* ------------------------------------------------------------------ */

export async function createBooking(params: {
  contractorId: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  conversationId: string;
  startsAt: string;
  notes: string;
}) {
  const service = await resolveService(params.contractorId, params.serviceId, params.serviceName);

  if (!service) {
    return { error: "Service not found or inactive. Pass the exact service name from list_services." };
  }

  const startsAt = new Date(params.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "startsAt must be an ISO 8601 instant from get_availability." };
  }
  const endsAt = new Date(startsAt.getTime() + service.durationMins * 60_000);
  const timeZone = await contractorTimezone(params.contractorId);

  if (!isInsideBusinessHours(startsAt, service.durationMins, timeZone)) {
    const window = searchWindow(startsAt, new Date(startsAt.getTime() + 60_000), timeZone);
    const busy = await prisma.booking.findMany({
      where: {
        contractorId: params.contractorId,
        serviceId: service.id,
        status: { in: ["PENDING", "CONFIRMED"] as BookingStatus[] },
        startsAt: { lte: window.dateTo },
        endsAt: { gte: window.dateFrom },
      },
      select: { startsAt: true, endsAt: true },
    });
    const alternatives = buildAvailableSlots({
      timeZone,
      durationMins: service.durationMins,
      dateFrom: window.dateFrom,
      dateTo: window.dateTo,
      busy,
    }).slice(0, 3);
    return {
      error: `That start is outside business hours (09:00–18:00 ${timeZone}). Do not book it. If the customer asked for a local time such as 10:00 AM, choose the slot whose localStart matches that time and only book it after they accept it.`,
      alternatives,
    };
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      contractorId: params.contractorId,
      serviceId: service.id,
      status: { in: ["PENDING", "CONFIRMED"] as BookingStatus[] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (conflict) {
    return {
      error: "That time is already booked. Offer the customer up to 3 other localStart values and wait. Do not create a booking for a different time.",
    };
  }

  const idempotencyKey = `${params.conversationId}-${params.startsAt}`;
  try {
    const booking = await prisma.booking.create({
      data: {
        contractorId: params.contractorId,
        customerId: params.customerId,
        serviceId: service.id,
        conversationId: params.conversationId,
        status: "CONFIRMED",
        startsAt,
        endsAt,
        notes: params.notes || null,
        idempotencyKey,
      },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        notes: true,
        service: { select: { name: true } },
      },
    });

    return { booking: presentBooking(booking, timeZone) };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existing = await prisma.booking.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        notes: true,
        service: { select: { name: true } },
      },
    });
    if (!existing) throw error;
    return { booking: presentBooking(existing, timeZone) };
  }
}

function presentBooking(
  booking: {
    id: string;
    status: BookingStatus;
    startsAt: Date;
    endsAt: Date;
    notes: string | null;
    service: { name: string };
  },
  timeZone: string,
) {
  return {
    id: booking.id,
    status: booking.status,
    serviceName: booking.service.name,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    localStart: formatLocal(booking.startsAt, timeZone),
    notes: booking.notes,
  };
}

/* ------------------------------------------------------------------ */
/*  list_customer_bookings                                               */
/* ------------------------------------------------------------------ */

export async function listCustomerBookings(customerId: string, contractorId: string) {
  const timeZone = await contractorTimezone(contractorId);
  const bookings = await prisma.booking.findMany({
    where: {
      customerId,
      contractorId,
      status: { in: ["PENDING", "CONFIRMED"] as BookingStatus[] },
      startsAt: { gte: new Date(Date.now() - 60 * 60_000) },
    },
    select: {
      id: true,
      status: true,
      startsAt: true,
      notes: true,
      service: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  return {
    timezone: timeZone,
    bookings: bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      serviceName: booking.service.name,
      startsAt: booking.startsAt.toISOString(),
      localStart: formatLocal(booking.startsAt, timeZone),
      notes: booking.notes,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  cancel_booking                                                       */
/* ------------------------------------------------------------------ */

export async function cancelBooking(bookingId: string, customerId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId },
    select: { id: true, status: true },
  });

  if (!booking) {
    return { error: "Booking not found or does not belong to this customer." };
  }

  if (booking.status === "CANCELLED") {
    return { error: "Booking is already cancelled." };
  }

  if (booking.status === "COMPLETED") {
    return { error: "Completed bookings cannot be cancelled." };
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
    select: { id: true, status: true },
  });

  return { booking: { id: updated.id, status: updated.status } };
}

/* ------------------------------------------------------------------ */
/*  handoff_to_human                                                     */
/* ------------------------------------------------------------------ */

export async function handoffToHuman(params: {
  conversationId: string;
  contractorId: string;
  reason: string;
}) {
  // Mark conversation as human handoff.
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { status: "HUMAN_HANDOFF", handoffReason: params.reason },
  });

  // Create a HumanHandoff record.
  const handoff = await prisma.humanHandoff.create({
    data: {
      contractorId: params.contractorId,
      conversationId: params.conversationId,
      status: "OPEN" as HandoffStatus,
      reason: params.reason,
    },
    select: { id: true, status: true, reason: true },
  });

  return {
    handoff: {
      id: handoff.id,
      status: handoff.status,
      reason: handoff.reason,
      message: "A human agent will be with you shortly.",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  identify_customer                                                    */
/* ------------------------------------------------------------------ */

export async function identifyCustomer(
  contractorId: string,
  conversationId: string,
  customerId: string,
  data: { name?: string; email?: string; phone?: string },
) {
  const updated = await linkOrUpdateCustomer({
    contractorId,
    conversationId,
    currentCustomerId: customerId,
    name: data.name,
    email: data.email,
    phone: data.phone,
  });

  return {
    customer: {
      id: updated?.id ?? customerId,
      name: updated?.name ?? data.name,
      email: updated?.email ?? data.email,
      phone: updated?.phone ?? data.phone,
    },
    message: "Customer profile identified and updated successfully.",
  };
}
