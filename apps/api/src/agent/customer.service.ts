import { prisma } from "../db.js";
import { isUniqueConstraintError } from "./customer.identity.js";

/**
 * Regular expressions for automatic frictionless identification
 */
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_REGEX = /(?:\+?56\s?9\s?\d{8}|\+?[1-9]\d{7,14}|\b9\d{8}\b)/;
const NAME_PATTERNS = [
  /(?:me llamo|mi nombre es|soy)\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+(?:\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+)?)/i,
  /(?:my name is|i am|i'm)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
];

/**
 * Extracts identity details from free text message if present
 */
export function extractIdentityFromText(text: string): {
  name?: string;
  email?: string;
  phone?: string;
} {
  const result: { name?: string; email?: string; phone?: string } = {};

  const emailMatch = text.match(EMAIL_REGEX);
  if (emailMatch && emailMatch[0]) {
    result.email = emailMatch[0].toLowerCase();
  }

  const phoneMatch = text.match(PHONE_REGEX);
  if (phoneMatch && phoneMatch[0]) {
    result.phone = phoneMatch[0].replace(/\s+/g, "");
  }

  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filter out common false positives like "aqui", "bien", "listo"
      if (!/^(aqui|aquí|bien|listo|un|una|el|la|cliente|guest)$/i.test(candidate)) {
        result.name = candidate;
        break;
      }
    }
  }

  return result;
}

const customerSummarySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
} as const;

export type CustomerSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

async function findCustomerByIdentity(
  contractorId: string,
  email: string | null,
  phone: string | null,
): Promise<CustomerSummary | null> {
  if (email) {
    const byEmail = await prisma.customer.findUnique({
      where: { contractorId_email: { contractorId, email } },
      select: customerSummarySelect,
    });
    if (byEmail) return byEmail;
  }

  if (phone) {
    return prisma.customer.findUnique({
      where: { contractorId_phone: { contractorId, phone } },
      select: customerSummarySelect,
    });
  }

  return null;
}

/**
 * Starts a conversation for a visitor who already has a profile, or creates one.
 * Repeating a stored guest email (conversation reset, retries) reuses that row
 * instead of inserting a duplicate `(contractorId, email)`.
 */
export async function findOrCreateCustomer(params: {
  contractorId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<CustomerSummary> {
  const name = params.name?.trim() || "Guest Customer";
  const email = params.email?.trim().toLowerCase() || null;
  const phone = params.phone?.trim() || null;

  const existing = await findCustomerByIdentity(params.contractorId, email, phone);
  if (existing) return existing;

  const createEmail = email ?? `guest_${crypto.randomUUID()}@example.com`;

  try {
    return await prisma.customer.create({
      data: {
        contractorId: params.contractorId,
        name,
        email: createEmail,
        phone,
      },
      select: customerSummarySelect,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const raced = await findCustomerByIdentity(
      params.contractorId,
      email ?? createEmail,
      phone,
    );
    if (raced) return raced;
    throw error;
  }
}

/**
 * Unifies or updates customer identity without friction.
 * If a customer already exists with the given email or phone,
 * the conversation and bookings are smoothly linked to that customer.
 */
export async function linkOrUpdateCustomer(params: {
  contractorId: string;
  conversationId: string;
  currentCustomerId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const { contractorId, conversationId, currentCustomerId, name, email, phone } = params;

  const cleanEmail = email?.trim().toLowerCase();
  const cleanPhone = phone?.trim();
  const cleanName = name?.trim();

  if (!cleanEmail && !cleanPhone && !cleanName) {
    return null;
  }

  // 1. Look for existing customer by email
  let existingCustomer = null;
  if (cleanEmail) {
    existingCustomer = await prisma.customer.findUnique({
      where: {
        contractorId_email: { contractorId, email: cleanEmail },
      },
    });
  }

  // 2. Look for existing customer by phone if not found
  if (!existingCustomer && cleanPhone) {
    existingCustomer = await prisma.customer.findUnique({
      where: {
        contractorId_phone: { contractorId, phone: cleanPhone },
      },
    });
  }

  // 3. If an existing profile was found and it's not the current one, merge/link
  if (existingCustomer) {
    if (existingCustomer.id !== currentCustomerId) {
      // Update missing fields on the existing customer
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          ...(cleanName && !existingCustomer.name ? { name: cleanName } : {}),
          ...(cleanPhone && !existingCustomer.phone ? { phone: cleanPhone } : {}),
        },
      });

      // Relink conversation to existing customer
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { customerId: existingCustomer.id },
      });

      // Relink any bookings created in this conversation
      await prisma.booking.updateMany({
        where: { conversationId },
        data: { customerId: existingCustomer.id },
      });

      // Delete placeholder guest customer if unused
      try {
        const guest = await prisma.customer.findUnique({
          where: { id: currentCustomerId },
          include: { _count: { select: { conversations: true, bookings: true } } },
        });
        if (
          guest &&
          guest._count.conversations === 0 &&
          guest._count.bookings === 0 &&
          guest.email?.startsWith("guest_")
        ) {
          await prisma.customer.delete({ where: { id: currentCustomerId } });
        }
      } catch {
        // Safe to ignore cleanup error
      }

      return existingCustomer;
    } else {
      // Same customer ID, just update details
      return await prisma.customer.update({
        where: { id: currentCustomerId },
        data: {
          ...(cleanName ? { name: cleanName } : {}),
          ...(cleanPhone ? { phone: cleanPhone } : {}),
        },
      });
    }
  }

  // 4. No conflicting customer, update current customer directly
  return await prisma.customer.update({
    where: { id: currentCustomerId },
    data: {
      ...(cleanName ? { name: cleanName } : {}),
      ...(cleanEmail ? { email: cleanEmail } : {}),
      ...(cleanPhone ? { phone: cleanPhone } : {}),
    },
  });
}
