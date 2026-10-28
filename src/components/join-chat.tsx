"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import logo from "@/assets/Chatingo.png";
import { PageAvatar } from "@/components/brand";
import { AuthFallback } from "@/components/auth-hero";
import { HeroShell } from "@/components/hero-shell";
import { Alert } from "@/components/loading";
import { forgotPath } from "@/lib/auth-redirect";
import { LIMITS } from "@/lib/constants";
import { api, isForbidden, isUnauthorized } from "@/lib/http";
import {
  cleanReferralCode,
  readClientReferral,
  saveClientReferral,
} from "@/lib/referral";
import type { JoinResult, PublicPage, SessionInfo } from "@/lib/types";

async function currentSession() {
  try {
    return await api<SessionInfo>("/api/auth/session");
  } catch {
    return null;
  }
}

function JoinShell({ children }: { children: React.ReactNode }) {
  return (
    <HeroShell className="grid grid-cols-1 items-start gap-8 px-6 py-8 sm:px-10 md:px-16 lg:grid-cols-2 lg:items-center lg:gap-12">
      <Link
        href="/"
        className="flex items-center justify-center"
        aria-label="Chat-in-go home"
      >
        <Image
          src={logo}
          alt="Chat-in-go"
          width={logo.width}
          height={logo.height}
          priority
          sizes="(min-width: 1024px) 40vw, 60vw"
          className="h-auto w-[min(100%,220px)] sm:w-[min(100%,280px)] lg:w-full lg:max-w-md"
        />
      </Link>
      <div className="mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:justify-self-center">
        {children}
      </div>
    </HeroShell>
  );
}

function joinReferral(explicit?: string | null) {
  return (
    cleanReferralCode(explicit) ||
    readClientReferral() ||
    undefined
  );
}

export function JoinChat() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const searchParams = useSearchParams();
  const referral = searchParams.get("ref") ?? "";
  const router = useRouter();
  const [page, setPage] = useState<PublicPage | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [joining, setJoining] = useState(false);
  const [managesPage, setManagesPage] = useState(false);
  const signedInUser = session?.role === "user" && !managesPage;
  const isPageStaff = session?.role === "admin" || managesPage;

  useEffect(() => {
    const code = cleanReferralCode(referral);
    if (!code) return;
    saveClientReferral(code);
    void api("/api/ref", {
      method: "POST",
      body: JSON.stringify({ ref: code }),
    }).catch(() => {});
  }, [referral]);

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
              body: JSON.stringify({ ref: joinReferral(referral) }),
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

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("missing");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [referral, router, slug]);

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError("");
  }

  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!slug) return;
    setError("");
    setJoining(true);
    try {
      if (mode === "signup") {
        await api<SessionInfo>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ firstName, lastName, email, password }),
        });
      } else {
        await api<SessionInfo>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      }
      const result = await api<JoinResult>(`/api/p/${slug}/join`, {
        method: "POST",
        body: JSON.stringify({ ref: joinReferral(referral) }),
      });
      router.replace(`/inbox?chat=${result.conversationId}`);
      router.refresh();
    } catch (caught) {
      if (isUnauthorized(caught)) {
        setError("Sign in or create an account to join this page.");
      } else if (isForbidden(caught)) {
        setManagesPage(true);
      } else {
        setError(
          caught instanceof Error ? caught.message : "Could not join this page.",
        );
      }
    } finally {
      setJoining(false);
    }
  }

  if (status === "loading") return <AuthFallback />;

  if (status === "missing" || !page) {
    return (
      <JoinShell>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          This page is not available
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Check the link or QR code and try again.
        </p>
      </JoinShell>
    );
  }

  if (isPageStaff || signedInUser) {
    return (
      <JoinShell>
        <div className="flex items-center gap-3">
          <PageAvatar
            name={page.name}
            imageUrl={page.imageUrl}
            size="lg"
            kind="page"
          />
          <h1 className="min-w-0 truncate text-[26px] font-semibold tracking-tight">
            {page.name}
          </h1>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
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
      </JoinShell>
    );
  }

  return (
    <JoinShell>
      <div className="flex items-center gap-3">
        <PageAvatar
          name={page.name}
          imageUrl={page.imageUrl}
          size="md"
          kind="page"
        />
        <h1 className="min-w-0 truncate text-[26px] font-semibold leading-tight tracking-tight">
          {page.name}
        </h1>
      </div>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(event) => void join(event)}
      >
        {mode === "signup" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="join-first-name">
                First name
              </label>
              <input
                id="join-first-name"
                className="field"
                value={firstName}
                maxLength={LIMITS.givenName}
                autoComplete="given-name"
                autoFocus
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="join-last-name">
                Last name
              </label>
              <input
                id="join-last-name"
                className="field"
                value={lastName}
                maxLength={LIMITS.givenName}
                autoComplete="family-name"
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </div>
          </div>
        ) : null}
        <div>
          <label className="label" htmlFor="join-email">
            Email
          </label>
          <input
            id="join-email"
            className="field"
            type="email"
            autoComplete="username"
            value={email}
            autoFocus={mode === "signin"}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="join-password">
            Password
          </label>
          <input
            id="join-password"
            className="field"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
          {mode === "signup" ? (
            <p className="mt-1.5 text-xs text-muted">
              Use at least 6 characters.
            </p>
          ) : (
            <p className="mt-1.5 text-right text-xs">
              <Link
                href={forgotPath({ next: slug ? `/p/${slug}` : null })}
                className="font-semibold text-ink"
              >
                Forgot password?
              </Link>
            </p>
          )}
        </div>
        <Alert>{error}</Alert>
        <button className="btn w-full" type="submit" disabled={joining}>
          {joining
            ? mode === "signup"
              ? "Joining"
              : "Signing in"
            : mode === "signup"
              ? "Join chat"
              : "Sign in and join"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm leading-6 text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="bg-transparent p-0 font-semibold text-ink"
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              className="bg-transparent p-0 font-semibold text-ink"
              onClick={() => switchMode("signup")}
            >
              Create an account
            </button>
          </>
        )}
      </p>
    </JoinShell>
  );
}
