import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox } from "@/components/inbox";
import { Loading } from "@/components/loading";

export const metadata: Metadata = {
  title: "Inbox",
};

export default function InboxPage() {
  return (
    <Suspense fallback={<Loading label="Loading page" />}>
      <Inbox />
    </Suspense>
  );
}
