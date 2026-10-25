import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Loading } from "@/components/loading";

export default function PagesLayout({ children }: LayoutProps<"/pages">) {
  return (
    <Suspense fallback={<Loading label="Loading pages" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
