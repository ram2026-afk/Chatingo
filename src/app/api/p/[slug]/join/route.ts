import { cookies } from "next/headers";
import { getOptionalSession } from "@/lib/auth";
import { REF_COOKIE } from "@/lib/constants";
import { cleanReferralCode } from "@/lib/referral";
import {
  errorResponse,
  HttpError,
  joinPageAsUser,
  userManagesSlug,
} from "@/lib/store";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const session = await getOptionalSession();
    if (session?.role === "admin") {
      throw new HttpError(403, "Sign in as a user to join this page.");
    }
    if (!session?.accountId || session.role !== "user") {
      throw new HttpError(401, "Sign in or create an account to join this page.");
    }
    if (await userManagesSlug(slug, session.accountId)) {
      throw new HttpError(
        403,
        "You manage this page. Reply from the page inbox.",
      );
    }
    const body = (await request.json().catch(() => null)) as {
      ref?: unknown;
    } | null;
    const jar = await cookies();
    const referralCode =
      cleanReferralCode(body?.ref) ||
      cleanReferralCode(jar.get(REF_COOKIE)?.value);
    const result = await joinPageAsUser(
      slug,
      session.accountId,
      referralCode || null,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
