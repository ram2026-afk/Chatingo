import { requireUser } from "@/lib/auth";
import { errorResponse, listUserChats } from "@/lib/store";

export async function GET() {
  try {
    const session = await requireUser();
    const chats = await listUserChats(session.accountId!);
    return Response.json({ chats });
  } catch (error) {
    return errorResponse(error);
  }
}
