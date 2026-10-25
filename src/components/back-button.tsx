import Link from "next/link";

function ChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M10.2 3.2 5.5 8l4.7 4.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BackButton({
  href,
  onClick,
  label,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  className?: string;
}) {
  const classes = `back-btn ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label}>
        <ChevronLeft />
      </Link>
    );
  }

  return (
    <button type="button" className={classes} aria-label={label} onClick={onClick}>
      <ChevronLeft />
    </button>
  );
}
