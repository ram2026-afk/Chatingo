import { passwordResetRedirectTo, requestOrigin } from "@/lib/auth-redirect";
import { errorResponse, HttpError, requestPasswordReset } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
    } | null;
    if (!body) throw new HttpError(400, "Enter your email.");
    await requestPasswordReset(
      body.email,
      passwordResetRedirectTo(requestOrigin(request)),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
