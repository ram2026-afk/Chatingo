import { requireAdmin, requirePageStaff } from "@/lib/auth";
import { createPage, errorResponse, listPages } from "@/lib/store";

export async function GET() {
  try {
    const session = await requirePageStaff();
    const pages = await listPages({
      role: session.role,
      accountId: session.accountId,
    });
    return Response.json({ pages });
  } catch (error) {
    return errorResponse(error);
  }
}

function formImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string" || value.size === 0) return null;
  return {
    type: value.type,
    size: value.size,
    arrayBuffer: () => value.arrayBuffer(),
  };
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const page = await createPage({
        name: form.get("name"),
        welcome: form.get("welcome"),
        image: formImage(form.get("image")),
      });
      return Response.json({ page }, { status: 201 });
    }
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      welcome?: unknown;
    } | null;
    const page = await createPage({
      name: body?.name,
      welcome: body?.welcome,
    });
    return Response.json({ page }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
