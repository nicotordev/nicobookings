import { describe, expect, test } from "bun:test";
import {
  isPlaceholderGuestEmail,
  isUniqueConstraintError,
  preferRealIdentity,
} from "./customer.identity.ts";

describe("guest customer identity", () => {
  test("recognizes placeholder guest emails", () => {
    expect(isPlaceholderGuestEmail("guest_1792713339241@example.com")).toBe(true);
    expect(isPlaceholderGuestEmail("  Guest_abc@example.com ")).toBe(true);
    expect(isPlaceholderGuestEmail("nico@example.com")).toBe(false);
    expect(isPlaceholderGuestEmail(null)).toBe(false);
  });

  test("lets a typed email replace the stored guest address", () => {
    const identity = preferRealIdentity({
      provided: {
        name: "Guest Customer",
        email: "guest_1792713339241@example.com",
      },
      extracted: { name: "Nico", email: "nico@example.com" },
    });

    expect(identity).toEqual({ name: "Nico", email: "nico@example.com" });
  });

  test("keeps a real stored email ahead of text extraction", () => {
    const identity = preferRealIdentity({
      provided: { name: "Nico", email: "nico@example.com", phone: "+56911111111" },
      extracted: { email: "other@example.com" },
    });

    expect(identity.email).toBe("nico@example.com");
    expect(identity.phone).toBe("+56911111111");
  });

  test("detects Prisma unique violations", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(
      isUniqueConstraintError({
        message: "Unique constraint failed on the constraint: `Customer_contractorId_email_key`",
      }),
    ).toBe(true);
    expect(isUniqueConstraintError(new Error("connection refused"))).toBe(false);
  });
});
