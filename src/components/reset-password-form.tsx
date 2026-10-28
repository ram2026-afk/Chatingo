"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthFallback, AuthHero } from "@/components/auth-hero";
import { Alert } from "@/components/loading";
import { forgotPath, loginPath, safeNext } from "@/lib/auth-redirect";
import { api } from "@/lib/http";
import type { SessionInfo } from "@/lib/types";

type Recovery = {
  accessToken?: string;
  tokenHash?: string;
};

const RECOVERY_KEY = "chat-in-go-password-recovery";

function readRecovery(): Recovery | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const search = new URLSearchParams(window.location.search);
  const type = hash.get("type") || search.get("type");
  const tokenHash =
    search.get("token_hash") ||
    (type === "recovery" ? search.get("token") : null);
  const accessToken = hash.get("access_token");
  if (tokenHash && (!type || type === "recovery")) return { tokenHash };
  if (accessToken && (!type || type === "recovery")) return { accessToken };
  return null;
}

function recoveryError() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const search = new URLSearchParams(window.location.search);
  const description =
    hash.get("error_description") || search.get("error_description");
  if (!description) return "";
  return decodeURIComponent(description.replace(/\+/g, " "));
}

function storedRecovery(): Recovery | null {
  try {
    const raw = sessionStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Recovery;
    if (parsed.accessToken || parsed.tokenHash) return parsed;
  } catch {
    return null;
  }
  return null;
}

function rememberRecovery(value: Recovery | null) {
  if (!value) {
    sessionStorage.removeItem(RECOVERY_KEY);
    return;
  }
  sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(value));
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const nextError = recoveryError();
    const nextRecovery = readRecovery() ?? storedRecovery();
    const params = new URLSearchParams(window.location.search);
    params.delete("token_hash");
    params.delete("token");
    params.delete("type");
    params.delete("code");
    params.delete("error");
    params.delete("error_code");
    params.delete("error_description");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
    if (nextError) {
      rememberRecovery(null);
      setLinkError(nextError);
      setStatus("missing");
      return;
    }
    if (!nextRecovery) {
      setStatus("missing");
      return;
    }
    rememberRecovery(nextRecovery);
    setRecovery(nextRecovery);
    setStatus("ready");
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!recovery) return;
    setError("");
    setSubmitting(true);
    try {
      const session = await api<SessionInfo>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          ...recovery,
          password,
          confirm,
        }),
      });
      rememberRecovery(null);
      router.replace(safeNext(session.role, requestedNext));
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update password.",
      );
      setSubmitting(false);
    }
  }

  if (status === "loading") return <AuthFallback />;

  if (status === "missing" || !recovery) {
    return (
      <AuthHero>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          Reset link expired
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {linkError || "This reset link is invalid or has expired."}
        </p>
        <p className="mt-5 text-center text-sm leading-6 text-muted">
          <Link
            href={forgotPath({ next: requestedNext })}
            className="font-semibold text-ink"
          >
            Request a new link
          </Link>
        </p>
      </AuthHero>
    );
  }

  return (
    <AuthHero>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
        Set a new password
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Use at least 6 characters. You will be signed in after you save it.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(event) => void onSubmit(event)}
      >
        <div>
          <label className="label" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            className="field"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            id="confirm-password"
            className="field"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={6}
            required
          />
        </div>
        <Alert>{error}</Alert>
        <button className="btn w-full" type="submit" disabled={submitting}>
          {submitting ? "Saving password" : "Save password"}
        </button>
      </form>
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
