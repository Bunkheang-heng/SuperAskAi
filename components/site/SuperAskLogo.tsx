import Image from "next/image";
import Link from "next/link";

type Size = "sm" | "md" | "lg";
type Variant = "mark" | "lockup";

const SIZE: Record<
  Size,
  { mark: number; lockupH: number; word: number; gap: number }
> = {
  sm: { mark: 30, lockupH: 40, word: 18, gap: 8 },
  md: { mark: 34, lockupH: 72, word: 20, gap: 9 },
  lg: { mark: 40, lockupH: 96, word: 23, gap: 10 },
};

/** The S mark's intrinsic aspect ratio (638 × 579). */
const MARK_RATIO = 579 / 638;

/**
 * Brand lockup: the blue SuperAsk “S” mark (Angkor + chat bubble) beside a
 * blue → teal gradient wordmark, as in the Figma.
 * - `mark`: S icon + optional wordmark (headers / chat)
 * - `lockup`: full stacked logo with wordmark baked in
 * - `dark`: for dark surfaces — the mark renders white, the wordmark white → ice
 */
export function SuperAskLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  variant = "mark",
  asLink = true,
  dark = false,
}: {
  href?: string;
  size?: Size;
  showWordmark?: boolean;
  variant?: Variant;
  /** When false, render a non-link lockup (e.g. inside an existing button). */
  asLink?: boolean;
  dark?: boolean;
}) {
  const s = SIZE[size];

  const inner =
    variant === "lockup" ? (
      <Image
        src="/brand/superask-lockup-blue.png"
        alt="SuperAsk"
        width={Math.round(s.lockupH * (961 / 808))}
        height={s.lockupH}
        className="h-auto w-auto object-contain"
        style={{ height: s.lockupH, width: "auto" }}
        priority
      />
    ) : (
      <>
        <Image
          src="/brand/superask-mark-blue.png"
          alt=""
          width={s.mark}
          height={Math.round(s.mark * MARK_RATIO)}
          className="shrink-0 object-contain"
          style={{
            width: s.mark,
            height: "auto",
            filter: dark ? "brightness(0) invert(1)" : undefined,
          }}
          aria-hidden
          priority={size !== "sm"}
        />
        {showWordmark && (
          <span
            className={dark ? "grad-text-dark" : "grad-text"}
            style={{
              fontSize: s.word,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontFamily: "Inter, system-ui, sans-serif",
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
