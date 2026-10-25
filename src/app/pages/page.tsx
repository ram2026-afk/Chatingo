import type { Metadata } from "next";
import { PagesDashboard } from "@/components/pages-dashboard";

export const metadata: Metadata = {
  title: "Your pages",
};

export default function PagesPage() {
  return <PagesDashboard />;
}
