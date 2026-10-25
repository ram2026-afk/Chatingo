import { setSessionCookies } from "@/lib/session-cookie";
import { errorResponse, HttpError, sessionInfo, signUpUser } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
    } | null;
    if (!body) throw new HttpError(400, "Enter your name, email, and password.");
    const session = await signUpUser({
      name: body.name,
      email: body.email,
      password: body.password,
    });
    await setSessionCookies(session.token, session.role);
    return Response.json(await sessionInfo(session), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
