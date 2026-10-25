"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Alert, Loading } from "@/components/loading";
import { api, isForbidden, isUnauthorized } from "@/lib/http";
import type { PageSummary, SessionInfo } from "@/lib/types";

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
          router.replace("/");
          return;
        }
        if (isForbidden(caught)) {
          router.replace("/inbox");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not load pages.");
        setPages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!pages && !error) return <Loading compact label="Loading pages" />;

  const empty = Boolean(pages && pages.length === 0);
  const unread = (pages ?? []).reduce((total, page) => total + page.unreadCount, 0);
  const chats = (pages ?? []).reduce((total, page) => total + page.conversationCount, 0);

  const firstPage = empty && isAdmin;

  return (
    <main
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${
        firstPage ? "" : "items-center justify-center px-1 py-4"
      }`}
    >
      <div
        className={`card w-full min-w-0 ${
          firstPage
            ? "flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:px-16"
            : "max-w-md px-5 py-8 text-center sm:px-8 sm:py-10"
        }`}
      >
        {firstPage ? (
          <>
            <div className="text-center">
              <div className="flex justify-center">
                <Brand size="sm" />
              </div>
              <h1 className="mt-4 text-[24px] font-semibold tracking-tight sm:text-[28px]">
                Create your first page
              </h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
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
                  <p className="text-sm font-semibold">Share the link or QR code</p>
                  <p className="mt-0.5 text-sm leading-5 text-muted">
                    Visitors can join without creating an account.
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
            <Link href="/pages/new" className="btn mx-auto mt-1 w-full max-w-sm">
              Create a page
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Brand size="sm" />
            </div>
            <h1 className="mt-5 text-[24px] font-semibold tracking-tight sm:text-[28px]">
              {empty ? "No pages yet" : "Select a page"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {empty
                ? "Ask an admin to give you access to a page. Then you can reply to its chats."
                : "Choose a page from the list to read conversations and reply."}
            </p>
            {pages && pages.length > 0 ? (
              <p className="mt-4 text-sm text-muted">
                {pages.length} page{pages.length === 1 ? "" : "s"}
                {" · "}
                {chats} conversation{chats === 1 ? "" : "s"}
                {unread > 0 ? ` · ${unread} new` : ""}
              </p>
            ) : null}
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
            {isAdmin ? (
              <Link href="/pages/new" className="btn mt-5">
                New page
              </Link>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
