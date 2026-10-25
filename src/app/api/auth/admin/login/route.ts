import { setSessionCookies } from "@/lib/session-cookie";
import { errorResponse, HttpError, loginAdmin, sessionInfo } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      password?: unknown;
    } | null;
    if (!body) throw new HttpError(400, "Enter your email and password.");
    const session = await loginAdmin(body.email, body.password);
    await setSessionCookies(session.token, session.role);
    return Response.json(await sessionInfo(session));
  } catch (error) {
    return errorResponse(error);
  }
}
