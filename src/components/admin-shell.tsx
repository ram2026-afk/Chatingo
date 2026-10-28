"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Brand, PageAvatar } from "@/components/brand";
import { NoticeCount } from "@/components/messenger";
import { PageTabs } from "@/components/page-tabs";
import { TopBar } from "@/components/top-bar";
import { api, isForbidden, isUnauthorized } from "@/lib/http";
import { formatChatTime } from "@/lib/time";
import type { PageSummary, SessionInfo } from "@/lib/types";

type ShellPages = {
  pages: PageSummary[] | null;
  role: SessionInfo["role"] | null;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pages = useShellPages();
  return (
    <Suspense fallback={<AdminShellFrame pages={pages} segment={null}>{children}</AdminShellFrame>}>
      <AdminShellRoute pages={pages}>{children}</AdminShellRoute>
    </Suspense>
  );
}

function AdminShellRoute({
  pages,
  children,
}: {
  pages: ShellPages;
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  return (
    <AdminShellFrame pages={pages} segment={segment}>
      {children}
    </AdminShellFrame>
  );
}

function useShellPages(): ShellPages {
  const router = useRouter();
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [role, setRole] = useState<SessionInfo["role"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [data, session] = await Promise.all([
          api<{ pages: PageSummary[] }>("/api/pages"),
          api<SessionInfo>("/api/auth/session"),
        ]);
        if (!cancelled) {
          setPages(data.pages);
          setRole(session.role);
        }
      } catch (caught) {
        if (cancelled) return;
        if (isUnauthorized(caught)) {
          router.replace("/login");
          return;
        }
        if (isForbidden(caught)) {
          router.replace("/inbox");
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router]);

  return { pages, role };
}

function AdminShellFrame({
  pages: { pages, role },
  segment,
  children,
}: {
  pages: ShellPages;
  segment: string | null;
  children: React.ReactNode;
}) {
  const onNew = segment === "new";
  const onInbox = Boolean(segment) && !onNew;
  const isAdmin = role === "admin";

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <TopBar
        variant="canvas"
        leading={
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/pages" className="min-w-0" aria-label="Chat-in-go">
              <Brand size="sm" wordmark={false} />
            </Link>
            {isAdmin ? (
              <Link
                href="/pages/new"
                className="btn btn-sm shrink-0"
                aria-current={onNew ? "page" : undefined}
              >
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 3.2v9.6M3.2 8h9.6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                New page
              </Link>
            ) : null}
          </div>
        }
      >
        {role === "user" ? (
          <Link href="/inbox" className="btn btn-sm shrink-0">
            Switch to chats view
          </Link>
        ) : null}
      </TopBar>
      <PageTabs pages={pages} selectedId={onInbox ? segment : null} />
      <div className="flex min-h-0 min-w-0 flex-1 gap-2 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-3 sm:pl-[max(0.75rem,env(safe-area-inset-left))] sm:pr-[max(0.75rem,env(safe-area-inset-right))] sm:pb-3">
        {pages && pages.length > 0 ? (
          <aside className="card hidden min-h-0 w-full shrink-0 flex-col overflow-hidden lg:flex lg:w-[320px] xl:w-[340px]">
            <nav
              className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
              aria-label="Pages"
            >
              {pages.map((page) => {
                const href = `/pages/${page.id}`;
                const selected = segment === page.id;
                return (
                  <Link
                    key={page.id}
                    href={href}
                    className={`conv-item ${selected ? "conv-item-active" : ""}`}
                    aria-current={selected ? "page" : undefined}
                  >
                    <PageAvatar
                      name={page.name}
                      imageUrl={page.imageUrl}
                      kind="page"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold">
                          {page.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">
                          {page.lastActivityAt
                            ? formatChatTime(page.lastActivityAt)
                            : ""}
                        </span>
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[13px] ${
                          page.unreadCount > 0
                            ? "font-semibold text-ink"
                            : "text-muted"
                        }`}
                      >
                        {page.unreadCount > 0 && page.lastPreview
                          ? page.lastPreview
                          : page.conversationCount === 0
                            ? "No conversations yet"
                            : `${page.conversationCount} conversation${page.conversationCount === 1 ? "" : "s"}`}
                      </span>
                    </span>
                    <NoticeCount count={page.unreadCount} />
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
