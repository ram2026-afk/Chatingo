import type { AccountRole } from "@/lib/constants";

export function homeFor(role: AccountRole) {
  return role === "user" ? "/inbox" : "/pages";
}

export function loginPath(options?: {
  next?: string | null;
  mode?: "signin" | "signup";
}) {
  const params = new URLSearchParams();
  if (options?.mode === "signup") params.set("mode", "signup");
  if (options?.next) params.set("next", options.next);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function forgotPath(options?: { next?: string | null }) {
  const params = new URLSearchParams();
  if (options?.next) params.set("next", options.next);
  const query = params.toString();
  return query ? `/forgot-password?${query}` : "/forgot-password";
}

export function requestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) return `${proto || "https"}://${host}`;
  return url.origin;
}

export function passwordResetRedirectTo(origin: string) {
  return `${origin.replace(/\/$/, "")}/reset-password`;
}

export function safeNext(role: AccountRole, value: string | null | undefined) {
  if (role === "admin" && value?.startsWith("/pages")) return value;
  if (
    role === "user" &&
    (value?.startsWith("/inbox") ||
      value?.startsWith("/p/") ||
      value?.startsWith("/pages"))
  ) {
    return value;
  }
  return homeFor(role);
}
