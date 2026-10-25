import type { Metadata } from "next";
import { NewPageForm } from "@/components/new-page-form";

export const metadata: Metadata = {
  title: "New page",
};

export default function NewPage() {
  return <NewPageForm />;
}
