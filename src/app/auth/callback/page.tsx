import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleCallback } from "@/components/google-callback";
import { Loading } from "@/components/loading";

export const metadata: Metadata = {
  title: "Google sign in",
  robots: { index: false, follow: false },
};

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<Loading label="Signing in with Google" />}>
      <GoogleCallback />
    </Suspense>
  );
}
