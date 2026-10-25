import { getOptionalSession } from "@/lib/auth";
import {
  errorResponse,
  HttpError,
  joinPage,
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
    if (session?.role === "user" && session.accountId) {
      if (await userManagesSlug(slug, session.accountId)) {
        throw new HttpError(
          403,
          "You manage this page. Reply from the page inbox.",
        );
      }
      const result = await joinPageAsUser(slug, session.accountId);
      return Response.json(result, { status: 201 });
    }
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
    } | null;
    const result = await joinPage(slug, body?.name);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
