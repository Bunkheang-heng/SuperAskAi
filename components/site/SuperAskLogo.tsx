import Link from "next/link";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, { icon: number; word: number; gap: number }> = {
  sm: { icon: 28, word: 15, gap: 8 },
  md: { icon: 34, word: 17, gap: 10 },
  lg: { icon: 40, word: 20, gap: 12 },
};

/** Shield-and-check mark from app/icon.svg — same geometry, themeable fill. */
function Mark({
  size,
  tone,
}: {
  size: number;
  tone: "default" | "onDark";
}) {
  const fill = tone === "onDark" ? "#fff" : "#025094";
  const stroke = tone === "onDark" ? "#025094" : "#fff";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-hidden
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill={fill} />
      <path
        d="M16 6.2 8.6 9.3v6.1c0 4.6 3.1 8.9 7.4 10.4 4.3-1.5 7.4-5.8 7.4-10.4V9.3L16 6.2Z"
        fill="none"
        stroke={stroke}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="m12.6 16.1 2.5 2.5 4.6-4.9"
        fill="none"
        stroke={stroke}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Brand lockup: icon.svg shield mark + SuperAsk wordmark.
 * `onDark` flips the mark for deep brand bars (sidebar / chat header).
 */
export function SuperAskLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  tone = "default",
  asLink = true,
}: {
  href?: string;
  size?: Size;
  showWordmark?: boolean;
  tone?: "default" | "onDark";
  /** When false, render a non-link lockup (e.g. inside an existing button). */
  asLink?: boolean;
}) {
  const s = SIZE[size];
  const wordColor = tone === "onDark" ? "#fff" : "var(--sa-deep)";

  const inner = (
    <>
      <Mark size={s.icon} tone={tone} />
      {showWordmark && (
        <span
          className="font-semibold tracking-tight"
          style={{
            color: wordColor,
            fontSize: s.word,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          SuperAsk
        </span>
      )}
    </>
  );

  const className = "inline-flex items-center";
  const style = { gap: s.gap };

  if (!asLink) {
    return (
      <span className={className} style={style} aria-label="SuperAsk">
        {inner}
      </span>
    );
  }

  return (
    <Link href={href} aria-label="SuperAsk" className={className} style={style}>
      {inner}
    </Link>
  );
}
