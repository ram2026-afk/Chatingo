import type { AccountRole } from "@/lib/constants";

export const AUTH_NEXT_KEY = "pages_auth_next";

export function homeFor(role: AccountRole) {
  return role === "user" ? "/inbox" : "/pages";
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

export function homeWithError(message: string, next?: string | null) {
  const params = new URLSearchParams();
  params.set("error", message);
  if (next) params.set("next", next);
  return `/?${params.toString()}`;
}
