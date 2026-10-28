export function HeroShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className="flex h-dvh items-stretch overflow-hidden bg-canvas"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
      }}
    >
      <section
        className={`card flex min-h-0 w-full min-w-0 overflow-y-auto ${className ?? "items-center justify-center"}`}
      >
        {children}
      </section>
    </main>
  );
}
