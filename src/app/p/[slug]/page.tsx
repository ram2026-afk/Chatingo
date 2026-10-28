import { Suspense } from "react";
import { AuthFallback } from "@/components/auth-hero";
import { JoinChat } from "@/components/join-chat";

export default function PublicPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <JoinChat />
    </Suspense>
  );
}
