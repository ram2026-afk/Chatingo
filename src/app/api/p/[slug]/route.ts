import { errorResponse, getPublicPage } from "@/lib/store";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const page = await getPublicPage(slug);
    return Response.json({ page });
  } catch (error) {
    return errorResponse(error);
  }
}
