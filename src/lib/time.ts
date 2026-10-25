function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function sameDay(left: string, right: string) {
  const a = new Date(left);
  const b = new Date(right);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return startOfDay(a) === startOfDay(b);
}

export function formatDayLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);
  }
  if (date.getFullYear() === new Date().getFullYear()) {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatChatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    date,
  );
}

export function mergeMessages<T extends {
  id: string;
  sender: string;
  body: string;
  imageUrl?: string | null;
  pending?: boolean;
}>(
  current: T[],
  incoming: T[],
) {
  const pending = current.filter((message) => message.pending);
  const stillPending = pending.filter(
    (message) =>
      !incoming.some(
        (next) =>
          next.sender === message.sender &&
          next.body === message.body &&
          Boolean(next.imageUrl) === Boolean(message.imageUrl),
      ),
  );
  return [...incoming, ...stillPending];
}
