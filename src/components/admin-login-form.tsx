"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Alert } from "@/components/loading";
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
  const [ready, setReady] = useState(false);

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
          Admin sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          This page is only for the account owner.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
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
      </div>
    </main>
  );
}
