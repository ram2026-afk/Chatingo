import { requireAdmin } from "@/lib/auth";
import { errorResponse, grantPageAccess, listPageStaff } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const staff = await listPageStaff(id);
    return Response.json({ staff });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
    } | null;
    const staff = await grantPageAccess(id, {
      email: body?.email,
    });
    return Response.json({ staff }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
