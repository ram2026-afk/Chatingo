import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/Chatingo.png";
import { HeroShell } from "@/components/hero-shell";
import { loginPath } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "Chat-in-go",
};

export default function HomePage() {
  return (
    <HeroShell className="flex-col items-center justify-center gap-8 px-6 sm:gap-10 sm:px-10 md:px-16">
      <Image
        src={logo}
        alt="Chat-in-go"
        width={logo.width}
        height={logo.height}
        priority
        sizes="100vw"
        className="h-auto w-full max-w-3xl"
      />
      <Link href={loginPath({ mode: "signup" })} className="btn min-w-40 px-8">
        Get started
      </Link>
    </HeroShell>
  );
}
