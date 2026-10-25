import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/constants";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  const path = request.nextUrl.pathname;
  const userPath = path === "/inbox" || path.startsWith("/inbox/");

  if (session && role === "admin" && userPath) {
    return NextResponse.redirect(new URL("/pages", request.url));
  }
  if (session && (role === "admin" || role === "user")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/pages", "/pages/:path*", "/inbox", "/inbox/:path*"],
};
