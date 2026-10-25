import { requireAdmin } from "@/lib/auth";
import { errorResponse, revokePageAccess } from "@/lib/store";

type Context = { params: Promise<{ id: string; staffId: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id, staffId } = await context.params;
    await revokePageAccess(id, staffId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
