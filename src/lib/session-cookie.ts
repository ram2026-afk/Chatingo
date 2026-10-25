import { cookies } from "next/headers";
import {
  ROLE_COOKIE,
  SESSION_COOKIE,
  SESSION_SECONDS,
  type AccountRole,
} from "@/lib/constants";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

export async function setSessionCookies(token: string, role: AccountRole) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions);
  jar.set(ROLE_COOKIE, role, cookieOptions);
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ROLE_COOKIE);
}
