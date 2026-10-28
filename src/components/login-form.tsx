"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import logo from "@/assets/Chatingo.png";
import { HeroShell } from "@/components/hero-shell";
import { Alert } from "@/components/loading";
import { forgotPath, loginPath, safeNext } from "@/lib/auth-redirect";
import { LIMITS } from "@/lib/constants";
import { api } from "@/lib/http";
import type { SessionInfo } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const requestedMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(requestedMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    let cancelled = false;
    api<SessionInfo>("/api/auth/session")
      .then((session) => {
        if (!cancelled) router.replace(safeNext(session.role, requestedNext));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [requestedNext, router]);

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError("");
    router.replace(loginPath({ next: requestedNext, mode: nextMode }));
  }

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
            mode === "signup"
              ? { firstName, lastName, email, password }
              : { email, password },
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
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          {mode === "signup" ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use your email to keep your chats and open them again later.
        </p>
        <div className="role-switch role-switch-2 mt-5">
          <button
            type="button"
            aria-pressed={mode === "signin"}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => switchMode("signup")}
          >
            Sign up
          </button>
        </div>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(event) => void onSubmit(event)}
        >
          {mode === "signup" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="first-name">
                  First name
                </label>
                <input
                  id="first-name"
                  className="field"
                  value={firstName}
                  maxLength={LIMITS.givenName}
                  autoComplete="given-name"
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="last-name">
                  Last name
                </label>
                <input
                  id="last-name"
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
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
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
                  href={forgotPath({ next: requestedNext })}
                  className="font-semibold text-ink"
                >
                  Forgot password?
                </Link>
              </p>
            )}
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
        <p className="mt-5 text-center text-sm leading-6 text-muted">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link
                href={loginPath({ next: requestedNext })}
                className="font-semibold text-ink"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link
                href={loginPath({ next: requestedNext, mode: "signup" })}
                className="font-semibold text-ink"
              >
                Create an account
              </Link>
            </>
          )}
        </p>
        <div className="mt-3 flex justify-center">
          <Link href="/privacy" className="btn btn-sm btn-text">
            Privacy
          </Link>
        </div>
      </div>
    </HeroShell>
  );
}
