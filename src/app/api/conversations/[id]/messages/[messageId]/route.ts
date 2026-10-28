import { getOptionalSession } from "@/lib/auth";
import {
  actOnPageMessage,
  actOnUserMessage,
  errorResponse,
  HttpError,
} from "@/lib/store";
import type { ChatAction } from "@/lib/types";

type Context = { params: Promise<{ id: string; messageId: string }> };

function readAction(raw: unknown): ChatAction {
  if (!raw || typeof raw !== "object") {
    throw new HttpError(400, "Choose an action.");
  }
  const data = raw as Record<string, unknown>;
  if (data.remove === true) return { remove: true };
  if (typeof data.pin === "boolean") return { pin: data.pin };
  if (typeof data.reaction === "string") return { reaction: data.reaction };
  throw new HttpError(400, "Choose an action.");
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id, messageId } = await context.params;
    const action = readAction(await request.json().catch(() => null));
    const session = await getOptionalSession();
    if (session?.role === "admin") {
      const message = await actOnPageMessage(
        id,
        { role: session.role, accountId: session.accountId },
        messageId,
        action,
      );
      return Response.json(message);
    }
    if (session?.role === "user" && session.accountId) {
      try {
        const message = await actOnPageMessage(
          id,
          { role: session.role, accountId: session.accountId },
          messageId,
          action,
        );
        return Response.json(message);
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 403) throw error;
        const message = await actOnUserMessage(
          id,
          session.accountId,
          messageId,
          action,
        );
        return Response.json(message);
      }
    }
    throw new HttpError(401, "Sign in required.");
  } catch (error) {
    return errorResponse(error);
  }
}
