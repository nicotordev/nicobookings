/**
 * Placeholder addresses created when a visitor has not given an email yet.
 * These must not block a later, real address from the same chat.
 */
export function isPlaceholderGuestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^guest_.+@example\.com$/i.test(email.trim());
}

export type IdentityFields = {
  name?: string;
  email?: string;
  phone?: string;
};

/**
 * Prefer a real name, email, or phone over the guest placeholder stored in the widget.
 */
export function preferRealIdentity(input: {
  provided?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  extracted: IdentityFields;
}): IdentityFields {
  const providedName = input.provided?.name?.trim();
  const providedEmail = input.provided?.email?.trim().toLowerCase();
  const providedPhone = input.provided?.phone?.trim();

  const name =
    providedName && providedName !== "Guest Customer"
      ? providedName
      : input.extracted.name ?? (providedName || undefined);

  const email =
    providedEmail && !isPlaceholderGuestEmail(providedEmail)
      ? providedEmail
      : input.extracted.email ?? (providedEmail || undefined);

  const phone = providedPhone || input.extracted.phone || undefined;

  const identity: IdentityFields = {};
  if (name) identity.name = name;
  if (email) identity.email = email;
  if (phone) identity.phone = phone;
  return identity;
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "P2002") return true;
  return (
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("Unique constraint failed")
  );
}
