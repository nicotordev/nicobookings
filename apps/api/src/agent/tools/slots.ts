export type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type CalendarParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type AvailableSlot = {
  startsAt: string;
  endsAt: string;
  localStart: string;
};

const OPEN_MINUTE = 9 * 60;
const CLOSE_MINUTE = 18 * 60;

export function zonedParts(date: Date, timeZone: string): CalendarParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const wallAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return wallAsUtc - date.getTime();
}

/** Converts a wall-clock time in `timeZone` to a UTC instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = offsetMs(utcGuess, timeZone);
  const corrected = new Date(utcGuess.getTime() - offset);
  const secondOffset = offsetMs(corrected, timeZone);
  if (secondOffset === offset) return corrected;
  return new Date(utcGuess.getTime() - secondOffset);
}

export function formatLocal(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function isInsideBusinessHours(start: Date, durationMins: number, timeZone: string): boolean {
  const startParts = zonedParts(start, timeZone);
  const endParts = zonedParts(new Date(start.getTime() + durationMins * 60_000), timeZone);
  const sameDay =
    startParts.year === endParts.year &&
    startParts.month === endParts.month &&
    startParts.day === endParts.day;
  const startMinute = startParts.hour * 60 + startParts.minute;
  const endMinute = endParts.hour * 60 + endParts.minute;
  return sameDay && startMinute >= OPEN_MINUTE && endMinute <= CLOSE_MINUTE;
}

function dayKey(parts: Pick<CalendarParts, "year" | "month" | "day">): number {
  return parts.year * 10_000 + parts.month * 100 + parts.day;
}

function addCalendarDays(
  parts: Pick<CalendarParts, "year" | "month" | "day">,
  days: number,
): Pick<CalendarParts, "year" | "month" | "day"> {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * Business hours are 09:00–18:00 in the contractor timezone, every 30 minutes.
 * A one-day search returns every free slot. A longer search still includes
 * 10:00 and 15:00 on each day so the customer's requested hour is not dropped.
 */
export function buildAvailableSlots(input: {
  timeZone: string;
  durationMins: number;
  dateFrom: Date;
  dateTo: Date;
  busy: BusyInterval[];
}): AvailableSlot[] {
  if (
    Number.isNaN(input.dateFrom.getTime()) ||
    Number.isNaN(input.dateTo.getTime()) ||
    input.dateTo <= input.dateFrom
  ) {
    return [];
  }

  const singleDay = input.dateTo.getTime() - input.dateFrom.getTime() <= 36 * 3_600_000;
  const firstDay = zonedParts(input.dateFrom, input.timeZone);
  const lastDay = zonedParts(new Date(input.dateTo.getTime() - 1), input.timeZone);
  const slots: AvailableSlot[] = [];
  let cursor = { year: firstDay.year, month: firstDay.month, day: firstDay.day };

  for (let day = 0; day < 21 && dayKey(cursor) <= dayKey(lastDay); day += 1) {
    const daySlots: Array<AvailableSlot & { hour: number; minute: number }> = [];
    for (let minuteOfDay = OPEN_MINUTE; minuteOfDay + input.durationMins <= CLOSE_MINUTE; minuteOfDay += 30) {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      const start = zonedTimeToUtc(cursor.year, cursor.month, cursor.day, hour, minute, input.timeZone);
      const end = new Date(start.getTime() + input.durationMins * 60_000);
      if (start < input.dateFrom || start >= input.dateTo) continue;
      const overlaps = input.busy.some((busy) => start < busy.endsAt && end > busy.startsAt);
      if (overlaps) continue;
      daySlots.push({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        localStart: formatLocal(start, input.timeZone),
        hour,
        minute,
      });
    }

    const kept = singleDay ? daySlots : daySlots.filter((slot) => slot.minute === 0 && [9, 10, 11, 13, 15, 17].includes(slot.hour));
    for (const slot of kept.length > 0 ? kept : daySlots.slice(0, 6)) {
      slots.push({ startsAt: slot.startsAt, endsAt: slot.endsAt, localStart: slot.localStart });
    }
    cursor = addCalendarDays(cursor, 1);
  }

  return slots;
}

/**
 * A search of 36 hours or less is the customer's local calendar day.
 * That keeps 10:00 AM even when the caller passed 10:00 UTC.
 */
export function searchWindow(
  dateFrom: Date,
  dateTo: Date,
  timeZone: string,
): { dateFrom: Date; dateTo: Date } {
  if (
    Number.isNaN(dateFrom.getTime()) ||
    Number.isNaN(dateTo.getTime()) ||
    dateTo.getTime() - dateFrom.getTime() > 36 * 3_600_000
  ) {
    return { dateFrom, dateTo };
  }
  const midpoint = new Date((dateFrom.getTime() + dateTo.getTime()) / 2);
  const parts = zonedParts(midpoint, timeZone);
  const from = zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, timeZone);
  return { dateFrom: from, dateTo: new Date(from.getTime() + 24 * 3_600_000) };
}

/** A future weekday at a wall-clock time in `timeZone`. */
export function futureLocalSlot(dayOffset: number, hour: number, minute: number, timeZone: string): Date {
  const today = zonedParts(new Date(), timeZone);
  let cursor = addCalendarDays(today, dayOffset);
  for (let guard = 0; guard < 7; guard += 1) {
    const weekday = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) break;
    cursor = addCalendarDays(cursor, 1);
  }
  return zonedTimeToUtc(cursor.year, cursor.month, cursor.day, hour, minute, timeZone);
}
