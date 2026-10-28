import type { RetentionNotice } from "@/lib/types";

const TIME_ZONE = "America/New_York";
const KEEP_DAYS = 2;

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function startOfZonedDay(year: number, month: number, day: number) {
  let ms = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let hour = 0; hour < 36; hour += 1) {
    const parts = zonedParts(new Date(ms));
    if (parts.year === year && parts.month === month && parts.day === day) {
      while (true) {
        const previous = ms - 60 * 60 * 1000;
        const previousParts = zonedParts(new Date(previous));
        if (
          previousParts.year !== year ||
          previousParts.month !== month ||
          previousParts.day !== day
        ) {
          break;
        }
        ms = previous;
      }
      return new Date(ms);
    }
    ms += 60 * 60 * 1000;
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function shiftDay(year: number, month: number, day: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function zonedDayKey(date = new Date()) {
  const { year, month, day } = zonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function retainedFrom(now = new Date()) {
  const today = zonedParts(now);
  const keepFrom = shiftDay(today.year, today.month, today.day, -(KEEP_DAYS - 1));
  return startOfZonedDay(keepFrom.year, keepFrom.month, keepFrom.day);
}

export function retentionNotice(now = new Date()): RetentionNotice {
  const today = zonedParts(now);
  const removed = shiftDay(today.year, today.month, today.day, -KEEP_DAYS);
  const keptFrom = shiftDay(today.year, today.month, today.day, -(KEEP_DAYS - 1));
  const from = startOfZonedDay(removed.year, removed.month, removed.day);
  const to = startOfZonedDay(keptFrom.year, keptFrom.month, keptFrom.day);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    deleteOn: to.toISOString(),
    text: `Chat from ${formatDay(from)} has been removed.`,
  };
}
