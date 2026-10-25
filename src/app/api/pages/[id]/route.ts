import { requireAdmin, requirePageStaff } from "@/lib/auth";
import {
  deletePage,
  errorResponse,
  getPageDetail,
  HttpError,
  updatePageImage,
} from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

function formImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string" || value.size === 0) return null;
  return {
    type: value.type,
    size: value.size,
    arrayBuffer: () => value.arrayBuffer(),
  };
}

export async function GET(_request: Request, context: Context) {
  try {
    const session = await requirePageStaff();
    const { id } = await context.params;
    const detail = await getPageDetail(id, {
      role: session.role,
      accountId: session.accountId,
    });
    return Response.json(detail);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const image = formImage(form.get("image"));
      if (!image) throw new HttpError(400, "Choose an image to upload.");
      const page = await updatePageImage(id, image);
      return Response.json({ page });
    }
    const body = (await request.json().catch(() => null)) as {
      image?: unknown;
    } | null;
    if (body && body.image === null) {
      const page = await updatePageImage(id, null);
      return Response.json({ page });
    }
    throw new HttpError(400, "Choose an image to upload.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    await deletePage(id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
