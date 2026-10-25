import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Loading } from "@/components/loading";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  );
}
