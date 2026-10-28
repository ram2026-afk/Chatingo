"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import logo from "@/assets/Chatingo.png";
import { HeroShell } from "@/components/hero-shell";
import { Alert } from "@/components/loading";
import { loginPath } from "@/lib/auth-redirect";
import { api } from "@/lib/http";
import type { SessionInfo } from "@/lib/types";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<SessionInfo>("/api/auth/session")
      .then((session) => {
        if (cancelled) return;
        if (session.role === "admin") {
          router.replace(
            requestedNext?.startsWith("/pages") ? requestedNext : "/pages",
          );
          return;
        }
        router.replace(session.role === "user" ? "/inbox" : "/pages");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [requestedNext, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api<SessionInfo>("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace(
        requestedNext?.startsWith("/pages") ? requestedNext : "/pages",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
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
          Admin sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          This page is only for the account owner.
        </p>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(event) => void onSubmit(event)}
        >
          <div>
            <label className="label" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              className="field"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Alert>{error}</Alert>
          <button className="btn w-full" type="submit" disabled={submitting}>
            {submitting ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm leading-6 text-muted">
          Not the owner?{" "}
          <Link href={loginPath()} className="font-semibold text-ink">
            Sign in
          </Link>
        </p>
      </div>
    </HeroShell>
  );
}
