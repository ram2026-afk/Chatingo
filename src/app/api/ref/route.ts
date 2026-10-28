import { cookies } from "next/headers";
import { REF_COOKIE, REF_COOKIE_SECONDS } from "@/lib/constants";
import { errorResponse, HttpError } from "@/lib/errors";
import { cleanReferralCode } from "@/lib/referral";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      ref?: unknown;
    } | null;
    const code = cleanReferralCode(body?.ref);
    if (!code) throw new HttpError(400, "Referral link is invalid.");
    const jar = await cookies();
    jar.set(REF_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: REF_COOKIE_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
