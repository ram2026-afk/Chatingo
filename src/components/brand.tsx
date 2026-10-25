import Image from "next/image";
import logo from "@/assets/Chatingo.png";

export function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const wordHeight = size === "sm" ? 28 : 54;
  const markHeight = size === "sm" ? 34 : 64;
  const markWidth = Math.round(markHeight * (logo.width / logo.height));

  return (
    <span
      className={`brand brand-${size}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 6 : 8,
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <Image
        src={logo}
        alt=""
        width={markWidth}
        height={markHeight}
        className="brand-mark"
        priority={size === "md"}
        style={{ flexShrink: 0, height: markHeight, width: "auto" }}
      />
      <svg
        className="brand-word"
        viewBox="0 0 400 76"
        height={wordHeight}
        role="img"
        aria-label="Chat-in-go"
        style={{ display: "block", minWidth: 0, flex: "1 1 auto" }}
      >
        <g
          fontFamily="'Arial Black', 'Arial Bold', var(--font-brand), Impact, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="56"
          letterSpacing="-1.6"
        >
          <text x="4" y="53">
            <tspan fill="#111111">Chat</tspan>
            <tspan fill="#1a6dff">-in-</tspan>
            <tspan fill="#7ee03a">go</tspan>
          </text>
        </g>
      </svg>
    </span>
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function DefaultAvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5z" />
    </svg>
  );
}

export function DefaultPageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 1.5V8a1 1 0 0 0 1 1h4.5z" />
    </svg>
  );
}

export function PageAvatar({
  name,
  imageUrl,
  size = "md",
  kind = "page",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  kind?: "page" | "person";
}) {
  return (
    <span
      className={`avatar${size === "md" ? "" : ` avatar-${size}`}`}
      aria-label={name}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : kind === "person" ? (
        <DefaultAvatarIcon />
      ) : (
        <DefaultPageIcon />
      )}
    </span>
  );
}
