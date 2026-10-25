"use client";

import { BackButton } from "@/components/back-button";
import { PageAvatar } from "@/components/brand";
import { formatChatTime } from "@/lib/time";

export function ChatFrame({
  sidebar,
  thread,
  showThread,
}: {
  sidebar: React.ReactNode;
  thread: React.ReactNode;
  showThread: boolean;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-2 sm:gap-3">
      <aside
        className={`${
          showThread ? "hidden md:flex" : "flex"
        } card min-h-0 min-w-0 w-full flex-col overflow-hidden md:w-[380px] lg:w-[400px] xl:w-[420px] md:shrink-0`}
      >
        {sidebar}
      </aside>
      <section
        className={`${
          showThread ? "flex" : "hidden md:flex"
        } card min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:max-w-[560px]`}
      >
        {thread}
      </section>
    </div>
  );
}

export function NoticeCount({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="notice-count" aria-label={`${count} new messages`}>
      {label}
    </span>
  );
}

export function ConversationItem({
  name,
  preview,
  time,
  selected,
  unreadCount = 0,
  imageUrl,
  kind = "person",
  onClick,
}: {
  name: string;
  preview: string;
  time: string;
  selected: boolean;
  unreadCount?: number;
  imageUrl?: string | null;
  kind?: "page" | "person";
  onClick: () => void;
}) {
  const unread = unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`conv-item ${selected ? "conv-item-active" : ""}`}
    >
      <PageAvatar name={name} imageUrl={imageUrl} kind={kind} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold">{name}</span>
          <span className="shrink-0 text-[11px] text-muted">
            {time ? formatChatTime(time) : ""}
          </span>
        </span>
        <span
          className={`mt-0.5 block truncate text-[13px] ${
            unread ? "font-semibold text-ink" : "text-muted"
          }`}
        >
          {preview}
        </span>
      </span>
      <NoticeCount count={unreadCount} />
    </button>
  );
}

export function ThreadHeader({
  name,
  subtitle,
  imageUrl,
  kind = "person",
  onBack,
}: {
  name: string;
  subtitle?: string;
  imageUrl?: string | null;
  kind?: "page" | "person";
  onBack?: () => void;
}) {
  return (
    <div className="flex min-h-14 min-w-0 shrink-0 items-center gap-2 px-2 py-2.5 sm:min-h-[68px] sm:gap-3 sm:px-4 sm:py-3">
      {onBack ? (
        <BackButton
          label="Back to chats"
          className="md:hidden"
          onClick={onBack}
        />
      ) : null}
      <PageAvatar name={name} imageUrl={imageUrl} size="lg" kind={kind} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[16px] font-semibold">{name}</h2>
        {subtitle ? (
          <p className="truncate text-xs text-muted">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyThread({
  title,
  body,
  name,
  imageUrl,
  kind = "page",
}: {
  title: string;
  body: string;
  name?: string;
  imageUrl?: string | null;
  kind?: "page" | "person";
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-soft px-6">
      <PageAvatar name={name || "P"} imageUrl={imageUrl} size="lg" kind={kind} />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-center text-sm leading-6 text-muted">
        {body}
      </p>
    </div>
  );
}
