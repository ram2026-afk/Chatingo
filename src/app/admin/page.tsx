import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { Loading } from "@/components/loading";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminLoginForm />
    </Suspense>
  );
}
