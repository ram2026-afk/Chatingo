export function Loading({
  label = "Loading",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-canvas ${compact ? "min-h-0 flex-1" : "h-dvh"}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    />
  );
}

export function Alert({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-soft px-3 py-2.5 text-sm text-ink"
      style={{ boxShadow: "inset 4px 0 0 var(--danger)" }}
    >
      {children}
    </p>
  );
}
