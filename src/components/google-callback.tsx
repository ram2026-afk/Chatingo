"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/loading";
import {
  AUTH_NEXT_KEY,
  homeWithError,
  safeNext,
} from "@/lib/auth-redirect";
import { ApiError, api } from "@/lib/http";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { SessionInfo } from "@/lib/types";

const inflight = new Map<string, Promise<string>>();

function savedNext() {
  try {
    const value = sessionStorage.getItem(AUTH_NEXT_KEY);
    sessionStorage.removeItem(AUTH_NEXT_KEY);
    return value;
  } catch {
    return null;
  }
}

function publicMessage(caught: unknown) {
  if (caught instanceof ApiError && caught.message.length > 0 && caught.message.length < 80) {
    return caught.message;
  }
  return "Google sign-in did not finish.";
}

function complete(key: string, work: () => Promise<string>) {
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = work();
  inflight.set(key, promise);
  return promise;
}

async function finishGoogleSignIn(code: string | null, oauthError: string | null) {
  const next = savedNext();
  if (oauthError === "access_denied") {
    return homeWithError("Google sign-in was cancelled.", next);
  }
  if (oauthError || !code) {
    return homeWithError("Google sign-in did not finish.", next);
  }
  try {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      throw new Error("Google sign-in did not finish.");
    }
    const session = await api<SessionInfo>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ accessToken: data.session.access_token }),
    });
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return safeNext(session.role, next);
  } catch (caught) {
    return homeWithError(publicMessage(caught), next);
  }
}

export function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    const oauthError = searchParams.get("error");
    const code = searchParams.get("code");
    const key = code || oauthError || "missing";

    void complete(key, () => finishGoogleSignIn(code, oauthError)).then((path) => {
      if (cancelled) return;
      router.replace(path);
      if (!path.startsWith("/?")) router.refresh();
    });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <Loading label="Signing in with Google" />;
}
