import { requireUser } from "@/lib/auth";
import { ensureReferralCode, errorResponse, listUserChats } from "@/lib/store";

export async function GET() {
  try {
    const session = await requireUser();
    const [chats, referralCode] = await Promise.all([
      listUserChats(session.accountId!),
      ensureReferralCode(session.accountId!),
    ]);
    return Response.json({ chats, referralCode });
  } catch (error) {
    return errorResponse(error);
  }
}
