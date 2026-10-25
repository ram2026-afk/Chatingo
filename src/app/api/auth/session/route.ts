import { getOptionalSession } from "@/lib/auth";
import { errorResponse, HttpError, sessionInfo } from "@/lib/store";

export async function GET() {
  try {
    const session = await getOptionalSession();
    if (!session) throw new HttpError(401, "Sign in required.");
    return Response.json(await sessionInfo(session));
  } catch (error) {
    return errorResponse(error);
  }
}
