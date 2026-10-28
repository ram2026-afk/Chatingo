"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand, DefaultPageIcon } from "@/components/brand";
import { Alert } from "@/components/loading";
import { api, isForbidden, isUnauthorized } from "@/lib/http";
import type { PageSummary, SessionInfo } from "@/lib/types";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 text-sm">
      <span className="font-semibold text-ink">{value}</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}

export function PagesDashboard() {
  const router = useRouter();
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ pages: PageSummary[] }>("/api/pages"),
      api<SessionInfo>("/api/auth/session"),
    ])
      .then(([data, session]) => {
        if (!cancelled) {
          setPages(data.pages);
          setIsAdmin(session.role === "admin");
        }
      })
      .catch((caught) => {
        if (cancelled) return;
        if (isUnauthorized(caught)) {
          router.replace("/login");
          return;
        }
        if (isForbidden(caught)) {
          router.replace("/inbox");
          return;
        }
        setError(
          caught instanceof Error ? caught.message : "Could not load pages.",
        );
        setPages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!pages && !error) {
    return (
      <main
        className="card min-h-0 flex-1"
        role="status"
        aria-live="polite"
        aria-label="Loading pages"
      />
    );
  }

  const empty = Boolean(pages && pages.length === 0);
  const unread = (pages ?? []).reduce(
    (total, page) => total + page.unreadCount,
    0,
  );
  const chats = (pages ?? []).reduce(
    (total, page) => total + page.conversationCount,
    0,
  );
  const firstPage = empty && isAdmin;

  return (
    <main className="card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 sm:px-10 lg:px-16">
        {firstPage ? (
          <div className="w-full max-w-3xl">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <Brand size="sm" wordmark={false} />
              <h1 className="mt-5 text-[26px] font-semibold tracking-tight sm:text-[32px]">
                Create your first page
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                A page is a public inbox. People open a link or scan a QR code
                and can message you right away.
              </p>
            </div>
            <ol className="setup-steps setup-steps-wide">
              <li>
                <span className="setup-num">1</span>
                <div>
                  <p className="text-sm font-semibold">Name the page</p>
                  <p className="mt-0.5 text-sm leading-5 text-muted">
                    Use a name people know, like your shop, office, or team.
                  </p>
                </div>
              </li>
              <li>
                <span className="setup-num">2</span>
                <div>
                  <p className="text-sm font-semibold">
                    Share the link or QR code
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-muted">
                    People sign in or create an account so they can keep the
                    chat.
                  </p>
                </div>
              </li>
              <li>
                <span className="setup-num">3</span>
                <div>
                  <p className="text-sm font-semibold">Reply from this inbox</p>
                  <p className="mt-0.5 text-sm leading-5 text-muted">
                    New chats show up here so you can answer in one place.
                  </p>
                </div>
              </li>
            </ol>
            <Alert>{error}</Alert>
            <Link
              href="/pages/new"
              className="btn mx-auto mt-1 w-full max-w-sm lg:mx-0"
            >
              Create a page
            </Link>
          </div>
        ) : (
          <div className="flex w-full max-w-lg flex-col items-center text-center">
            <span className="avatar avatar-xl" aria-hidden="true">
              <DefaultPageIcon />
            </span>
            <h1 className="mt-5 text-[26px] font-semibold tracking-tight sm:text-[32px]">
              {empty ? "No pages yet" : "Select a page"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {empty
                ? "Ask an admin to give you access to a page. Then you can reply to its chats."
                : "Choose a page from the list to read conversations and reply."}
            </p>
            {pages && pages.length > 0 ? (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Stat
                  value={pages.length}
                  label={pages.length === 1 ? "page" : "pages"}
                />
                <Stat
                  value={chats}
                  label={chats === 1 ? "conversation" : "conversations"}
                />
                {unread > 0 ? <Stat value={unread} label="new" /> : null}
              </div>
            ) : null}
            <div className="mt-4 w-full">
              <Alert>{error}</Alert>
            </div>
            {isAdmin ? (
              <Link href="/pages/new" className="btn mt-5 min-w-40">
                New page
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
