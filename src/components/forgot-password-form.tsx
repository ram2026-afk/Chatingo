"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthHero } from "@/components/auth-hero";
import { Alert } from "@/components/loading";
import { loginPath } from "@/lib/auth-redirect";
import { api } from "@/lib/http";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send a reset link.",
      );
      setSubmitting(false);
    }
  }

  return (
    <AuthHero>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
        Forgot password
      </h1>
      {sent ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          If an account exists for that email, we sent a link to set a new
          password.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-muted">
            Enter the email you used to join. We will send a link to set a new
            password.
          </p>
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => void onSubmit(event)}
          >
            <div>
              <label className="label" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                className="field"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <Alert>{error}</Alert>
            <button className="btn w-full" type="submit" disabled={submitting}>
              {submitting ? "Sending link" : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p className="mt-5 text-center text-sm leading-6 text-muted">
        <Link
          href={loginPath({ next: requestedNext })}
          className="font-semibold text-ink"
        >
          Back to sign in
        </Link>
      </p>
    </AuthHero>
  );
}
