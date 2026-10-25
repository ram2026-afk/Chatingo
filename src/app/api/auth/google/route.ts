import { setSessionCookies } from "@/lib/session-cookie";
import { errorResponse, HttpError, loginWithGoogle, sessionInfo } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      accessToken?: unknown;
    } | null;
    if (!body) throw new HttpError(400, "Google sign-in did not finish.");
    const session = await loginWithGoogle(body.accessToken);
    await setSessionCookies(session.token, session.role);
    return Response.json(await sessionInfo(session));
  } catch (error) {
    return errorResponse(error);
  }
}
