"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Alert } from "@/components/loading";
import { AUTH_NEXT_KEY, safeNext } from "@/lib/auth-redirect";
import { LIMITS } from "@/lib/constants";
import { api } from "@/lib/http";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { SessionInfo } from "@/lib/types";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<SessionInfo>("/api/auth/session")
      .then((session) => {
        if (!cancelled) router.replace(safeNext(session.role, requestedNext));
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requestedNext, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await api<SessionInfo>(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(
            mode === "signup" ? { name, email, password } : { email, password },
          ),
        },
      );
      router.replace(safeNext(session.role, requestedNext));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not continue.");
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    setError("");
    setSubmitting(true);
    try {
      if (requestedNext) sessionStorage.setItem(AUTH_NEXT_KEY, requestedNext);
      else sessionStorage.removeItem(AUTH_NEXT_KEY);
      const supabase = supabaseBrowser();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(
        /not enabled|unsupported provider/i.test(message)
          ? "Google sign-in is not enabled yet."
          : message && message.length < 80
            ? message
            : "Could not start Google sign-in.",
      );
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Loading</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-y-auto px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] py-6 sm:px-4 sm:py-10">
      <div className="card w-full min-w-0 max-w-[440px] p-5 sm:p-9">
        <Brand />
        <h1 className="mt-6 text-[26px] font-semibold leading-tight tracking-tight sm:mt-7 sm:text-[30px]">
          {mode === "signup" ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Join a page from its link or QR code, or sign in to keep your chats.
          You can also message a page without an account.
        </p>
        <div className="role-switch role-switch-2 mt-6">
          <button
            type="button"
            aria-pressed={mode === "signin"}
            onClick={() => {
              setMode("signin");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Sign up
          </button>
        </div>
        <button
          className="btn btn-google mt-6 w-full"
          type="button"
          disabled={submitting}
          style={{
            background: "#ffffff",
            borderColor: "#d6d6d6",
            color: "#111111",
          }}
          onClick={() => void onGoogle()}
        >
          <GoogleMark />
          Continue with Google
        </button>
        <p className="auth-split">or</p>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          {mode === "signup" ? (
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="field"
                value={name}
                maxLength={LIMITS.staffName}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="field"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="field"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>
          <Alert>{error}</Alert>
          <button className="btn w-full" type="submit" disabled={submitting}>
            {submitting
              ? mode === "signup"
                ? "Creating account"
                : "Signing in"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
