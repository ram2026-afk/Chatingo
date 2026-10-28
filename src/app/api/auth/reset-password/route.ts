import { setSessionCookies } from "@/lib/session-cookie";
import {
  completePasswordReset,
  errorResponse,
  HttpError,
  sessionInfo,
} from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      accessToken?: unknown;
      tokenHash?: unknown;
      password?: unknown;
      confirm?: unknown;
    } | null;
    if (!body) throw new HttpError(400, "Enter a new password.");
    const session = await completePasswordReset({
      accessToken: body.accessToken,
      tokenHash: body.tokenHash,
      password: body.password,
      confirm: body.confirm,
    });
    await setSessionCookies(session.token, session.role);
    return Response.json(await sessionInfo(session));
  } catch (error) {
    return errorResponse(error);
  }
}
