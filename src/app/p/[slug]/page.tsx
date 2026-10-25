import { Suspense } from "react";
import { JoinChat } from "@/components/join-chat";
import { Loading } from "@/components/loading";

export default function PublicPage() {
  return (
    <Suspense fallback={<Loading label="Opening page" />}>
      <JoinChat />
    </Suspense>
  );
}
