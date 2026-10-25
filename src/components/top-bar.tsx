"use client";

import { ProfileMenu } from "@/components/profile-menu";

export function TopBar({
  children,
  leading,
  variant = "card",
}: {
  children?: React.ReactNode;
  leading?: React.ReactNode;
  variant?: "card" | "canvas";
}) {
  return (
    <header
      className={`sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 ${
        variant === "canvas" ? "bg-canvas" : "bg-card"
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
        paddingRight: "max(1.5rem, calc(env(safe-area-inset-right) + 0.75rem))",
        minHeight: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      <div className="min-w-0">{leading}</div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        <ProfileMenu />
      </div>
    </header>
  );
}
