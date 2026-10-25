import { requireUser } from "@/lib/auth";
import { errorResponse, HttpError, updateProfileImage } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const form = await request.formData().catch(() => null);
    const file = form?.get("image");
    if (!file || typeof file === "string") {
      throw new HttpError(400, "Choose an image to upload.");
    }
    const imageUrl = await updateProfileImage(session.accountId!, {
      type: file.type,
      size: file.size,
      arrayBuffer: () => file.arrayBuffer(),
    });
    return Response.json({ imageUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
