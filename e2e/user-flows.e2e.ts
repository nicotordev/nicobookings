import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { formatLocal, futureLocalSlot } from "../apps/api/src/agent/tools/slots.ts";
import {
  conversationId,
  looksSpanish,
  readSnapshot,
  sendChat,
  waitForReply,
  type BookingSnapshot,
  type ConversationSnapshot,
} from "./chat.ts";
import { useCaseTitle } from "./use-cases.ts";

const customerUrl = "http://127.0.0.1:5173/?contractor=NicoBookings";
const timeZone = "America/Santiago";

const state: {
  conversationId: string;
  name: string;
  updatedName: string;
  email: string;
  updatedEmail: string;
  phone: string;
  serviceName: string;
  firstSlot: Date;
  movedSlot: Date;
} = {
  conversationId: "",
  name: "Camila Prado",
  updatedName: "Camila Soto",
  email: "",
  updatedEmail: "",
  phone: "",
  serviceName: "Haircut & Styling",
  firstSlot: new Date(),
  movedSlot: new Date(),
};

let customerContext: BrowserContext;
let customerPage: Page;

function allBookings(snapshot: ConversationSnapshot): BookingSnapshot[] {
  return snapshot.customer.bookings;
}

function activeBookings(snapshot: ConversationSnapshot): BookingSnapshot[] {
  return allBookings(snapshot).filter(
    (booking) => booking.status === "CONFIRMED" || booking.status === "PENDING",
  );
}

function assertEnglish(reply: string): void {
  expect(looksSpanish(reply), reply).toBe(false);
}

function sameInstant(stored: string, expected: Date): boolean {
  return new Date(stored).toISOString() === expected.toISOString();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const stamp = Date.now().toString(36);
  state.email = `e2e.${stamp}@example.com`;
  state.updatedEmail = `e2e.${stamp}.updated@example.com`;
  state.phone = `+569${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;
  const dayBase = 320 + (Date.now() % 120);
  state.firstSlot = futureLocalSlot(dayBase, 10, 0, timeZone);
  state.movedSlot = futureLocalSlot(dayBase + 12, 16, 0, timeZone);

  customerContext = await browser.newContext();
  customerPage = await customerContext.newPage();
  await customerPage.goto(customerUrl);
  await customerPage.evaluate(() => localStorage.clear());
  await customerPage.reload();
  await expect(customerPage.getByTestId("chat-input")).toBeVisible();
  state.conversationId = await conversationId(customerPage);
});

test.afterAll(async () => {
  await customerContext?.close();
});

test(useCaseTitle("customer.open-chat"), async () => {
  await expect(customerPage.getByRole("heading", { name: "How can we help you today?" })).toBeVisible();
  await expect(customerPage.getByRole("button", { name: /Services & Pricing/ })).toBeVisible();

  const previousId = state.conversationId;
  await customerPage.getByTitle("Start new conversation").click();
  await expect(customerPage.getByRole("heading", { name: "How can we help you today?" })).toBeVisible();
  state.conversationId = await conversationId(customerPage);
  expect(state.conversationId).not.toBe(previousId);
});

test(useCaseTitle("customer.list-services"), async () => {
  const before = await customerPage
    .locator('[data-testid="message-assistant"], [data-testid="message-staff"]')
    .count();
  await customerPage.getByRole("button", { name: /Services & Pricing/ }).click();
  const reply = await waitForReply(customerPage, before);
  assertEnglish(reply);
  expect(reply, reply).toContain(state.serviceName);
  const snapshot = readSnapshot(state.conversationId);
  expect(snapshot.contractor.services.some((service) => service.name === state.serviceName)).toBe(true);
});

test(useCaseTitle("customer.identify"), async () => {
  const reply = await sendChat(
    customerPage,
    `My name is ${state.name}. My email is ${state.email}.`,
  );
  assertEnglish(reply);
  await expect(customerPage.getByTestId("identity-toggle")).toContainText(state.name);
  const snapshot = readSnapshot(state.conversationId);
  expect(snapshot.customer.name).toBe(state.name);
  expect(snapshot.customer.email).toBe(state.email);
});

test(useCaseTitle("customer.update-contact"), async () => {
  await customerPage.getByTestId("identity-toggle").click();
  await customerPage.getByTestId("identity-name").fill(state.updatedName);
  await customerPage.getByTestId("identity-email").fill(state.updatedEmail);
  await customerPage.getByTestId("identity-save").click();
  await expect(customerPage.getByTestId("identity-toggle")).toContainText(state.updatedName);

  const reply = await sendChat(
    customerPage,
    `My name is ${state.updatedName}. My email is ${state.updatedEmail}. My phone number is ${state.phone}.`,
  );
  assertEnglish(reply);

  const snapshot = readSnapshot(state.conversationId);
  expect(snapshot.customer.name).toBe(state.updatedName);
  expect(snapshot.customer.email).toBe(state.updatedEmail);
  expect(snapshot.customer.phone).toBe(state.phone);
});

test(useCaseTitle("customer.create-booking"), async () => {
  const when = formatLocal(state.firstSlot, timeZone);
  const seen = new Set(allBookings(readSnapshot(state.conversationId)).map((booking) => booking.id));
  let reply = await sendChat(
    customerPage,
    `I would like to book ${state.serviceName} for ${when}.`,
  );
  assertEnglish(reply);

  let created = allBookings(readSnapshot(state.conversationId)).filter(
    (booking) => !seen.has(booking.id) && booking.status === "CONFIRMED",
  );
  if (created.length === 0) {
    reply = await sendChat(customerPage, `Yes, please book ${state.serviceName} for ${when}.`);
    assertEnglish(reply);
    created = allBookings(readSnapshot(state.conversationId)).filter(
      (booking) => !seen.has(booking.id) && booking.status === "CONFIRMED",
    );
  }

  expect(created, reply).toHaveLength(1);
  expect(sameInstant(created[0]?.startsAt ?? "", state.firstSlot), `${reply} booked ${created[0]?.startsAt}`).toBe(
    true,
  );
});

test(useCaseTitle("customer.reschedule-booking"), async () => {
  const before = readSnapshot(state.conversationId);
  const current = activeBookings(before).at(-1);
  expect(current, "No active booking to reschedule.").toBeTruthy();
  const currentId = current?.id ?? "";
  const fromWhen = formatLocal(state.firstSlot, timeZone);
  const toWhen = formatLocal(state.movedSlot, timeZone);

  let reply = await sendChat(
    customerPage,
    `Please move my ${state.serviceName} on ${fromWhen} to ${toWhen}.`,
  );
  assertEnglish(reply);

  const finished = (snapshot: ConversationSnapshot): boolean => {
    const cancelled = allBookings(snapshot).some(
      (booking) => booking.id === currentId && booking.status === "CANCELLED",
    );
    const moved = allBookings(snapshot).some(
      (booking) => booking.id !== currentId && booking.status === "CONFIRMED" && sameInstant(booking.startsAt, state.movedSlot),
    );
    return cancelled && moved;
  };

  let snapshot = readSnapshot(state.conversationId);
  if (!finished(snapshot)) {
    const moved = allBookings(snapshot).some(
      (booking) => booking.id !== currentId && booking.status === "CONFIRMED" && sameInstant(booking.startsAt, state.movedSlot),
    );
    reply = await sendChat(
      customerPage,
      moved
        ? `Yes, please cancel the ${state.serviceName} on ${fromWhen}.`
        : `Yes, please cancel the ${state.serviceName} on ${fromWhen} and book ${toWhen} instead.`,
    );
    assertEnglish(reply);
  }

  snapshot = readSnapshot(state.conversationId);
  const wrong = allBookings(snapshot).filter(
    (booking) =>
      booking.id !== currentId &&
      booking.status === "CONFIRMED" &&
      !sameInstant(booking.startsAt, state.movedSlot),
  );
  expect(wrong, reply).toHaveLength(0);
  expect(finished(snapshot), reply).toBe(true);
});

test(useCaseTitle("customer.cancel-booking"), async () => {
  const before = readSnapshot(state.conversationId);
  const current = activeBookings(before).at(-1);
  expect(current, "No active booking to cancel.").toBeTruthy();
  const currentId = current?.id ?? "";
  const when = formatLocal(state.movedSlot, timeZone);

  let reply = await sendChat(customerPage, `Please cancel my ${state.serviceName} on ${when}.`);
  assertEnglish(reply);

  const cancelled = (snapshot: ConversationSnapshot): boolean =>
    allBookings(snapshot).some((booking) => booking.id === currentId && booking.status === "CANCELLED");

  if (!cancelled(readSnapshot(state.conversationId))) {
    reply = await sendChat(customerPage, "Yes, please cancel that appointment.");
    assertEnglish(reply);
  }

  const snapshot = readSnapshot(state.conversationId);
  expect(cancelled(snapshot), reply).toBe(true);
  expect(activeBookings(snapshot), reply).toHaveLength(0);
});

test(useCaseTitle("customer.escalate"), async () => {
  let reply = await sendChat(
    customerPage,
    "I need to speak with a person about a duplicate charge.",
  );
  assertEnglish(reply);
  if (readSnapshot(state.conversationId).status !== "HUMAN_HANDOFF") {
    reply = await sendChat(customerPage, "Please connect me with a person. This is about a billing charge.");
    assertEnglish(reply);
  }
  await expect(customerPage.getByTestId("handoff-notice")).toBeVisible();
  await expect(customerPage.getByText("Connected with Human Support")).toBeVisible();
  const snapshot = readSnapshot(state.conversationId);
  expect(snapshot.status).toBe("HUMAN_HANDOFF");
  expect(snapshot.handoffs.some((handoff) => handoff.status === "OPEN" || handoff.status === "ASSIGNED")).toBe(
    true,
  );
});

test(useCaseTitle("customer.message-during-handoff"), async () => {
  const reply = await sendChat(customerPage, "I am still here. The duplicate charge was 40 dollars.");
  assertEnglish(reply);
  expect(reply.toLowerCase()).toContain("support");
  await expect(customerPage.getByTestId("handoff-notice")).toBeVisible();
  await expect(customerPage.getByText("The duplicate charge was 40 dollars.")).toBeVisible();
});
