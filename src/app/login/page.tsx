import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFallback } from "@/components/auth-hero";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <LoginForm />
    </Suspense>
  );
}
