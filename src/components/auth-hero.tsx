import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/Chatingo.png";
import { HeroShell } from "@/components/hero-shell";

export function AuthHero({ children }: { children: React.ReactNode }) {
  return (
    <HeroShell className="grid grid-cols-1 items-start gap-8 px-6 py-8 sm:px-10 md:px-16 lg:grid-cols-2 lg:items-center lg:gap-12">
      <Link
        href="/"
        className="flex items-center justify-center"
        aria-label="Chat-in-go home"
      >
        <Image
          src={logo}
          alt="Chat-in-go"
          width={logo.width}
          height={logo.height}
          priority
          sizes="(min-width: 1024px) 40vw, 60vw"
          className="h-auto w-[min(100%,220px)] sm:w-[min(100%,280px)] lg:w-full lg:max-w-md"
        />
      </Link>
      <div className="mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:justify-self-center">
        {children}
      </div>
    </HeroShell>
  );
}

export function AuthFallback() {
  return (
    <AuthHero>
      <div className="min-h-48" />
    </AuthHero>
  );
}
