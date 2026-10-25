import { cookies } from "next/headers";
import { connection } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { clearSessionCookies } from "@/lib/session-cookie";
import { destroySession, errorResponse } from "@/lib/store";

export async function POST() {
  try {
    await connection();
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    await destroySession(token);
    await clearSessionCookies();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
