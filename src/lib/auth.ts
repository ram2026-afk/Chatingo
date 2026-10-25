import { cookies } from "next/headers";
import { connection } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { HttpError } from "@/lib/errors";
import { getSession } from "@/lib/store";

export async function getOptionalSession() {
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  try {
    return await getSession(token);
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) return null;
    throw error;
  }
}

export async function requireAdmin() {
  const session = await getOptionalSession();
  if (!session) throw new HttpError(401, "Sign in required.");
  if (session.role !== "admin") {
    throw new HttpError(403, "Admin sign in required.");
  }
  return session;
}

export async function requirePageStaff() {
  const session = await getOptionalSession();
  if (!session) throw new HttpError(401, "Sign in required.");
  if (session.role !== "admin" && session.role !== "user") {
    throw new HttpError(403, "Sign in required.");
  }
  return session;
}

export async function requireUser() {
  const session = await getOptionalSession();
  if (!session) throw new HttpError(401, "Sign in required.");
  if (session.role !== "user" || !session.accountId) {
    throw new HttpError(403, "User sign in required.");
  }
  return session;
}
