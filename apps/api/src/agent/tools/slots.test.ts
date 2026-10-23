import { describe, expect, test } from "bun:test";
import {
  buildAvailableSlots,
  isInsideBusinessHours,
  searchWindow,
  zonedParts,
  zonedTimeToUtc,
} from "./slots.ts";

describe("contractor timezone slots", () => {
  test("10:00 in Santiago is not 10:00 UTC in January", () => {
    const slot = zonedTimeToUtc(2027, 1, 18, 10, 0, "America/Santiago");
    const local = zonedParts(slot, "America/Santiago");
    expect(local.hour).toBe(10);
    expect(local.minute).toBe(0);
    expect(slot.toISOString()).not.toBe("2027-01-18T10:00:00.000Z");
    expect(isInsideBusinessHours(slot, 45, "America/Santiago")).toBe(true);
    expect(isInsideBusinessHours(new Date("2027-01-18T10:00:00.000Z"), 45, "America/Santiago")).toBe(false);
  });

  test("a multi-day search still offers 10:00 on the requested day", () => {
    const slots = buildAvailableSlots({
      timeZone: "America/Santiago",
      durationMins: 45,
      dateFrom: new Date("2027-01-01T00:00:00.000Z"),
      dateTo: new Date("2027-01-20T00:00:00.000Z"),
      busy: [],
    });
    const january18 = slots.filter((slot) => zonedParts(new Date(slot.startsAt), "America/Santiago").day === 18);
    expect(january18.some((slot) => zonedParts(new Date(slot.startsAt), "America/Santiago").hour === 10)).toBe(true);
  });

  test("a busy 10:00 is omitted and the rest of that morning remains", () => {
    const taken = zonedTimeToUtc(2027, 1, 18, 10, 0, "America/Santiago");
    const slots = buildAvailableSlots({
      timeZone: "America/Santiago",
      durationMins: 45,
      dateFrom: new Date("2027-01-18T03:00:00.000Z"),
      dateTo: new Date("2027-01-19T03:00:00.000Z"),
      busy: [{ startsAt: taken, endsAt: new Date(taken.getTime() + 45 * 60_000) }],
    });
    const hours = slots.map((slot) => zonedParts(new Date(slot.startsAt), "America/Santiago").hour);
    expect(hours).not.toContain(10);
    expect(hours).toContain(11);
  });

  test("a 10:00 UTC query still covers 10:00 in Santiago", () => {
    const window = searchWindow(
      new Date("2027-01-18T10:00:00.000Z"),
      new Date("2027-01-18T11:00:00.000Z"),
      "America/Santiago",
    );
    const slots = buildAvailableSlots({
      timeZone: "America/Santiago",
      durationMins: 45,
      dateFrom: window.dateFrom,
      dateTo: window.dateTo,
      busy: [],
    });
    expect(
      slots.some((slot) => zonedParts(new Date(slot.startsAt), "America/Santiago").hour === 10),
    ).toBe(true);
  });
});
