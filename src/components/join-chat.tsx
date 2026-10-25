"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageAvatar } from "@/components/brand";
import { Composer, MessageList } from "@/components/chat-ui";
import { useChatThread } from "@/components/use-chat-thread";
import { Alert, Loading } from "@/components/loading";
import { LIMITS } from "@/lib/constants";
import { api, isForbidden } from "@/lib/http";
import type { JoinResult, PublicPage, SessionInfo, Thread } from "@/lib/types";

type SavedVisit = {
  token: string;
  conversationId: string;
  name: string;
};

function storageKey(slug: string) {
  return `pages-visit:${slug}`;
}

function readSaved(slug: string): SavedVisit | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedVisit;
    if (!parsed.token || !parsed.conversationId || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSaved(slug: string, visit: SavedVisit) {
  localStorage.setItem(storageKey(slug), JSON.stringify(visit));
}

async function currentSession() {
  try {
    return await api<SessionInfo>("/api/auth/session");
  } catch {
    return null;
  }
}

export function JoinChat() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();
  const [page, setPage] = useState<PublicPage | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [visit, setVisit] = useState<SavedVisit | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [joining, setJoining] = useState(false);
  const [managesPage, setManagesPage] = useState(false);
  const signedInUser = session?.role === "user" && !managesPage;
  const isPageStaff = session?.role === "admin" || managesPage;
  const {
    thread,
    setThread,
    replyTo,
    setReplyTo,
    sendError,
    setSendError,
    send,
    act,
  } = useChatThread({
    conversationId: visit?.conversationId,
    sender: "visitor",
    enabled: Boolean(visit),
    headers:
      signedInUser || !visit
        ? undefined
        : { "x-visitor-token": visit.token },
  });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      try {
        const [data, nextSession] = await Promise.all([
          api<{ page: PublicPage }>(`/api/p/${slug}`),
          currentSession(),
        ]);
        if (cancelled) return;
        setPage(data.page);
        setSession(nextSession);
        setManagesPage(false);
        document.title = `${data.page.name} · Chat-in-go`;

        if (nextSession?.role === "user") {
          try {
            const result = await api<JoinResult>(`/api/p/${slug}/join`, {
              method: "POST",
              body: JSON.stringify({}),
            });
            if (cancelled) return;
            router.replace(`/inbox?chat=${result.conversationId}`);
            return;
          } catch (caught) {
            if (cancelled) return;
            if (isForbidden(caught)) {
              setManagesPage(true);
              setStatus("ready");
              return;
            }
            setError(
              caught instanceof Error
                ? caught.message
                : "Could not open this chat.",
            );
            setStatus("ready");
            return;
          }
        }

        if (nextSession?.role === "admin") {
          setStatus("ready");
          return;
        }

        const saved = readSaved(slug);
        if (saved) {
          try {
            const existing = await api<Thread>(
              `/api/conversations/${saved.conversationId}`,
              { headers: { "x-visitor-token": saved.token } },
            );
            if (cancelled) return;
            setVisit(saved);
            setThread(existing);
          } catch {
            localStorage.removeItem(storageKey(slug));
          }
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("missing");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, slug, setThread]);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!slug) return;
    setError("");
    if (!name.trim()) {
      setError("Enter your name to join.");
      return;
    }
    setJoining(true);
    try {
      const result = await api<JoinResult>(`/api/p/${slug}/join`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const saved: SavedVisit = {
        token: result.token,
        conversationId: result.conversationId,
        name: result.visitorName,
      };
      writeSaved(slug, saved);
      const next = await api<Thread>(
        `/api/conversations/${saved.conversationId}`,
        {
          headers: { "x-visitor-token": saved.token },
        },
      );
      setVisit(saved);
      setThread(next);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not join this page.",
      );
    } finally {
      setJoining(false);
    }
  }

  function leave() {
    if (signedInUser) {
      router.push("/inbox");
      return;
    }
    if (!slug) return;
    localStorage.removeItem(storageKey(slug));
    setVisit(null);
    setThread(null);
    setName("");
    setSendError("");
    setReplyTo(null);
  }

  if (status === "loading") return <Loading label="Opening page" />;

  if (status === "missing" || !page) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] py-6 sm:px-4">
        <div className="card w-full max-w-md p-5 sm:p-7">
          <h1 className="text-xl font-semibold">This page is not available</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Check the link or QR code and try again.
          </p>
        </div>
      </main>
    );
  }

  if (isPageStaff || signedInUser) {
    return (
      <main className="flex min-h-dvh items-center justify-center overflow-y-auto px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] py-6 sm:px-4 sm:py-10">
        <div className="card w-full min-w-0 max-w-md p-5 sm:p-9">
          <div className="flex items-center gap-3">
            <PageAvatar
              name={page.name}
              imageUrl={page.imageUrl}
              size="lg"
              kind="page"
            />
            <h1 className="min-w-0 truncate text-[26px] font-semibold tracking-tight sm:text-[30px]">
              {page.name}
            </h1>
          </div>
          <p className="mt-3 text-sm leading-6">
            {signedInUser
              ? error || "This chat is in your inbox."
              : session?.role === "admin"
              ? "You are signed in as admin. Share this link or QR code so people can join. Reply from the page inbox."
              : "You can reply to this page from the inbox. You cannot create pages."}
          </p>
          <Link
            href={signedInUser ? "/inbox" : "/pages"}
            className="btn mt-6 w-full"
          >
            {signedInUser ? "Open chats" : "Open inbox"}
          </Link>
        </div>
      </main>
    );
  }

  if (!visit || !thread) {
    return (
      <main className="flex min-h-dvh items-center justify-center overflow-y-auto px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] py-6 sm:px-4 sm:py-10">
        <div className="card w-full min-w-0 max-w-md p-5 sm:p-9">
          <div className="flex items-center gap-3">
            <PageAvatar
              name={page.name}
              imageUrl={page.imageUrl}
              size="lg"
              kind="page"
            />
            <h1 className="min-w-0 truncate text-[26px] font-semibold tracking-tight sm:text-[30px]">
              {page.name}
            </h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink">
            {page.welcome || "Send a message and this page can reply here."}
          </p>
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => void join(event)}
          >
            <div>
              <label className="label" htmlFor="visitor-name">
                Your name
              </label>
              <input
                id="visitor-name"
                className="field"
                value={name}
                maxLength={LIMITS.visitorName}
                autoComplete="name"
                autoFocus
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <Alert>{error}</Alert>
            <button className="btn w-full" type="submit" disabled={joining}>
              {joining ? "Joining" : "Join and message"}
            </button>
            <p className="text-xs leading-5 text-muted">
              No account needed. You can also{" "}
              <Link
                href={`/?next=/p/${slug}`}
                className="font-semibold text-ink"
              >
                sign in as a user
              </Link>
              .
            </p>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-canvas px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] py-2 sm:px-4 sm:py-6">
      <section className="card mx-auto flex h-full min-h-0 w-full min-w-0 max-w-lg flex-col overflow-hidden">
        <header className="flex min-w-0 items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <PageAvatar
              name={page.name}
              imageUrl={page.imageUrl}
              kind="page"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">{page.name}</h1>
              <p className="text-xs text-muted">Joined as {visit.name}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-text shrink-0"
            onClick={leave}
          >
            {signedInUser ? "Chats" : "Leave"}
          </button>
        </header>
        <MessageList
          messages={thread.messages}
          viewer="visitor"
          pageName={page.name}
          visitorName={visit.name}
          pageImageUrl={page.imageUrl}
          visitorImageUrl={session?.imageUrl}
          pageReadAt={thread.conversation.pageReadAt}
          visitorReadAt={thread.conversation.visitorReadAt}
          empty={
            page.welcome || "You're in. Send a message whenever you're ready."
          }
          retention={thread.retention}
          onReply={setReplyTo}
          onAct={act}
        />
        {sendError ? (
          <div className="bg-card px-3 pb-1">
            <Alert>{sendError}</Alert>
          </div>
        ) : null}
        <Composer
          placeholder={`Message ${page.name}`}
          replyTo={replyTo}
          replyName={
            replyTo
              ? replyTo.sender === "visitor"
                ? "You"
                : page.name
              : undefined
          }
          onCancelReply={() => setReplyTo(null)}
          onError={setSendError}
          onSend={async (payload) => {
            setSendError("");
            await send(payload);
          }}
        />
      </section>
    </main>
  );
}
