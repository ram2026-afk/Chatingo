import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";

export default function PagesLayout({ children }: LayoutProps<"/pages">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-canvas" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
