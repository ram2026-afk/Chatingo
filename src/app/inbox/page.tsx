import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { UserInbox } from "@/components/user-inbox";

export const metadata: Metadata = {
  title: "Your chats",
};

export default function InboxHomePage() {
  return (
    <Suspense fallback={<Loading label="Loading chats" />}>
      <UserInbox />
    </Suspense>
  );
}
