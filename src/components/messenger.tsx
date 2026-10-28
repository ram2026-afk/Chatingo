"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { PageAvatar } from "@/components/brand";
import { formatChatTime } from "@/lib/time";

export function ChatFrame({
  sidebar,
  thread,
  showThread,
}: {
  sidebar: ReactNode;
  thread: ReactNode;
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
  pending = false,
  onClick,
}: {
  name: string;
  preview: string;
  time: string;
  selected: boolean;
  unreadCount?: number;
  imageUrl?: string | null;
  kind?: "page" | "person";
  pending?: boolean;
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
            pending || unread ? "font-semibold text-ink" : "text-muted"
          }`}
        >
          {preview}
        </span>
      </span>
      {pending ? (
        <span className="pending-pill">Pending</span>
      ) : (
        <NoticeCount count={unreadCount} />
      )}
    </button>
  );
}

export function ThreadHeader({
  name,
  subtitle,
  imageUrl,
  kind = "person",
  onBack,
  onRemoveCustomer,
  removingCustomer = false,
}: {
  name: string;
  subtitle?: string;
  imageUrl?: string | null;
  kind?: "page" | "person";
  onBack?: () => void;
  onRemoveCustomer?: () => Promise<void> | void;
  removingCustomer?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function closeMenu() {
      setMenuOpen(false);
      setConfirm(false);
    }
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setConfirm(false);
  }, [name]);

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
      {onRemoveCustomer ? (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            className="settings-btn"
            aria-label="Chat actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setConfirm(false);
            }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="3.2" r="1.35" />
              <circle cx="8" cy="8" r="1.35" />
              <circle cx="8" cy="12.8" r="1.35" />
            </svg>
          </button>
          {menuOpen ? (
            <div className="profile-panel" role="menu">
              {confirm ? (
                <div>
                  <p className="text-sm font-semibold">Delete customer?</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {name} will not be able to message this page, and this chat
                    will be removed from their inbox.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary w-full"
                      disabled={removingCustomer}
                      onClick={() => setConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger w-full"
                      disabled={removingCustomer}
                      onClick={() => void onRemoveCustomer()}
                    >
                      {removingCustomer ? "Removing" : "Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger w-full"
                  role="menuitem"
                  onClick={() => setConfirm(true)}
                >
                  Delete customer
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function JoinPendingNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="join-pending">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      {action}
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
