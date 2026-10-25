import type { RetentionNotice } from "@/lib/types";

const TIME_ZONE = "America/New_York";

type RetentionRange = {
  from: Date;
  to: Date;
  deleteOn: Date;
};

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

function previousMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

function firstHalfRange(year: number, month: number): RetentionRange {
  return {
    from: startOfZonedDay(year, month, 1),
    to: startOfZonedDay(year, month, 16),
    deleteOn: startOfZonedDay(year, month, 17),
  };
}

function secondHalfRange(year: number, month: number): RetentionRange {
  const following = nextMonth(year, month);
  return {
    from: startOfZonedDay(year, month, 16),
    to: startOfZonedDay(following.year, following.month, 1),
    deleteOn: startOfZonedDay(following.year, following.month, 2),
  };
}

export function zonedDayKey(date = new Date()) {
  const { year, month, day } = zonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function retainedFrom(now = new Date()) {
  const { year, month, day } = zonedParts(now);
  if (day < 2) {
    const previous = previousMonth(year, month);
    return startOfZonedDay(previous.year, previous.month, 16);
  }
  if (day < 17) return startOfZonedDay(year, month, 1);
  return startOfZonedDay(year, month, 16);
}

function formatSpan(from: Date, last: Date) {
  const start = zonedParts(from);
  const end = zonedParts(last);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
  }).format(from);
  if (start.year === end.year && start.month === end.month) {
    return `${month} ${start.day}–${end.day}`;
  }
  return `${formatDay(from)}–${formatDay(last)}`;
}

function noticeForRange(range: RetentionRange): RetentionNotice {
  const last = new Date(range.to.getTime() - 1);
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    deleteOn: range.deleteOn.toISOString(),
    text: `Messages from ${formatSpan(range.from, last)} will be deleted on ${formatDay(range.deleteOn)}.`,
  };
}

export function retentionNotice(now = new Date()): RetentionNotice | null {
  const { year, month, day } = zonedParts(now);
  if (day === 16 || day === 17) {
    return noticeForRange(firstHalfRange(year, month));
  }
  if (day === 1 || day === 2) {
    const previous = previousMonth(year, month);
    return noticeForRange(secondHalfRange(previous.year, previous.month));
  }
  return null;
}

export function messageInRetention(
  createdAt: string,
  notice: RetentionNotice,
) {
  return createdAt >= notice.from && createdAt < notice.to;
}
