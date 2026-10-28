import { getOptionalSession } from "@/lib/auth";
import {
  addPageMessage,
  addUserMessage,
  errorResponse,
  HttpError,
} from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const image = form.get("image");
    return {
      body: form.get("body"),
      image: image instanceof File && image.size > 0 ? image : null,
      replyToId: form.get("replyToId"),
    };
  }
  const json = (await request.json().catch(() => null)) as {
    body?: unknown;
    replyToId?: unknown;
  } | null;
  return { body: json?.body, image: null, replyToId: json?.replyToId };
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payload = await readPayload(request);
    const session = await getOptionalSession();
    if (session?.role === "admin") {
      const message = await addPageMessage(
        id,
        payload.body,
        {
          role: session.role,
          accountId: session.accountId,
        },
        payload.image,
        payload.replyToId,
      );
      return Response.json(message, { status: 201 });
    }
    if (session?.role === "user" && session.accountId) {
      try {
        const message = await addPageMessage(
          id,
          payload.body,
          {
            role: session.role,
            accountId: session.accountId,
          },
          payload.image,
          payload.replyToId,
        );
        return Response.json(message, { status: 201 });
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 403) throw error;
        const message = await addUserMessage(
          id,
          session.accountId,
          payload.body,
          payload.image,
          payload.replyToId,
        );
        return Response.json(message, { status: 201 });
      }
    }
    throw new HttpError(401, "Sign in required.");
  } catch (error) {
    return errorResponse(error);
  }
}
