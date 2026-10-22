import { prisma } from "../../db.js";
import type { BookingStatus, HandoffStatus } from "../../generated/prisma/enums.js";
import { linkOrUpdateCustomer } from "../customer.service.js";

/* ------------------------------------------------------------------ */
/*  list_services                                                        */
/* ------------------------------------------------------------------ */

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
  dateFrom: string,
  dateTo: string,
) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, contractorId, isActive: true },
    select: { durationMins: true, name: true },
  });

  if (!service) {
    return { error: "Service not found or inactive." };
  }

  // Fetch existing confirmed/pending bookings that overlap the window.
  const existingBookings = await prisma.booking.findMany({
    where: {
      contractorId,
      serviceId,
      status: { in: ["PENDING", "CONFIRMED"] as BookingStatus[] },
      startsAt: { lte: new Date(dateTo) },
      endsAt: { gte: new Date(dateFrom) },
    },
    select: { startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });

  // Build candidate slots (business hours 09:00–18:00 in 30-min increments).
  const slotDuration = service.durationMins;
  const slots: { startsAt: string; endsAt: string }[] = [];

  const cursor = new Date(dateFrom);
  cursor.setMinutes(0, 0, 0);
  const end = new Date(dateTo);

  while (cursor < end) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + slotDuration * 60_000);

    const hour = slotStart.getUTCHours();
    const isBusinessHours = hour >= 9 && slotEnd.getUTCHours() <= 18;

    if (isBusinessHours) {
      const overlaps = existingBookings.some(
        (b) => slotStart < b.endsAt && slotEnd > b.startsAt,
      );
      if (!overlaps) {
        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
        });
      }
    }

    cursor.setMinutes(cursor.getMinutes() + 30);
  }

  return {
    service: { id: serviceId, name: service.name, durationMins: slotDuration },
    availableSlots: slots.slice(0, 20), // cap response size
  };
}

/* ------------------------------------------------------------------ */
/*  create_booking                                                       */
/* ------------------------------------------------------------------ */

export async function createBooking(params: {
  contractorId: string;
  customerId: string;
  serviceId: string;
  conversationId: string;
  startsAt: string;
  notes: string;
}) {
  const service = await prisma.service.findFirst({
    where: {
      id: params.serviceId,
      contractorId: params.contractorId,
      isActive: true,
    },
    select: { durationMins: true, name: true },
  });

  if (!service) {
    return { error: "Service not found or inactive." };
  }

  const startsAt = new Date(params.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMins * 60_000);

  // Check for conflicts.
  const conflict = await prisma.booking.findFirst({
    where: {
      contractorId: params.contractorId,
      serviceId: params.serviceId,
      status: { in: ["PENDING", "CONFIRMED"] as BookingStatus[] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (conflict) {
    return {
      error: "That time slot is no longer available. Please call get_availability for updated slots.",
    };
  }

  const booking = await prisma.booking.create({
    data: {
      contractorId: params.contractorId,
      customerId: params.customerId,
      serviceId: params.serviceId,
      conversationId: params.conversationId,
      status: "CONFIRMED",
      startsAt,
      endsAt,
      notes: params.notes || null,
      idempotencyKey: `${params.conversationId}-${params.startsAt}`,
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

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      serviceName: booking.service.name,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      notes: booking.notes,
    },
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
