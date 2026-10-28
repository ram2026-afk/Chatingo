import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { AuthFallback } from "@/components/auth-hero";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
