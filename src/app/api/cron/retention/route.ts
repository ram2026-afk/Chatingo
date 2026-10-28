import { errorResponse, purgeDueMessages } from "@/lib/store";
import { retainedFrom, retentionNotice } from "@/lib/retention";

export async function GET() {
  try {
    await purgeDueMessages();
    const notice = retentionNotice();
    return Response.json({
      ok: true,
      olderThan: retainedFrom().toISOString(),
      notice: notice.text,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
