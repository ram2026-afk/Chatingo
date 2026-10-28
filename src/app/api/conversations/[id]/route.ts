import { getOptionalSession } from "@/lib/auth";
import {
  errorResponse,
  getThreadForAdmin,
  getThreadForUser,
  HttpError,
} from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const headers = { "Cache-Control": "private, no-store, no-cache" };
    const session = await getOptionalSession();
    if (session?.role === "admin") {
      const thread = await getThreadForAdmin(id, {
        role: session.role,
        accountId: session.accountId,
      });
      return Response.json(thread, { headers });
    }
    if (session?.role === "user" && session.accountId) {
      try {
        const thread = await getThreadForAdmin(id, {
          role: session.role,
          accountId: session.accountId,
        });
        return Response.json(thread, { headers });
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 403) throw error;
        const thread = await getThreadForUser(id, session.accountId);
        return Response.json(thread, { headers });
      }
    }
    throw new HttpError(401, "Sign in required.");
  } catch (error) {
    return errorResponse(error);
  }
}
