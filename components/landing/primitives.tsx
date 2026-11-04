import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Lang } from "@/lib/ui/marketing";
import { COMMON, type Headline as HeadlineCopy, type PhoneDemo } from "@/lib/ui/landing";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Line height that suits the script. Khmer needs room for stacked subscript
 * consonants (FR-61); the design's tight Latin leading would clip them.
 */
export function lh(lang: Lang, en: number, km = 1.9): number {
  return lang === "km" ? Math.max(en, km) : en;
}

/** Deep link into the chat that asks `q` on arrival. */
export function askHref(q: string): string {
  return `/chat?q=${encodeURIComponent(q)}`;
}

export const GRADIENT = "linear-gradient(135deg,#046EC5,#64E8C7)";

/* ── Channel icons (from the Figma) ──────────────────────────────────────── */

export function TelegramIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#2AABEE" />
      <path
        d="M10.5 23.3l25.2-9.7c1.2-.4 2.2.3 1.8 2l-4.3 20.2c-.3 1.4-1.1 1.7-2.2 1.1l-6-4.4-2.9 2.8c-.3.3-.6.5-1.3.5l.5-6.5 12-10.8c.5-.5-.1-.7-.8-.2L15.2 27.8l-5.9-1.8c-1.3-.4-1.3-1.3.2-1.7z"
        fill="white"
      />
    </svg>
  );
}

export function MessengerIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="sa-mg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00B2FF" />
          <stop offset="100%" stopColor="#006AFF" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#sa-mg)" />
      <path
        d="M24 10C16.3 10 10 15.9 10 23.2c0 4.3 2.1 8.1 5.5 10.7v5.1l4.9-2.7c1.3.4 2.7.6 4.2.6 7.7 0 14-5.9 14-13.2S31.7 10 24 10zm1.4 17.8l-3.6-3.8-7 3.8 7.7-8.2 3.6 3.8 7-3.8-7.7 8.2z"
        fill="white"
      />
    </svg>
  );
}

export function WebIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#F0F9FF" />
      <circle cx="24" cy="24" r="12" stroke="#046EC5" strokeWidth="1.5" fill="none" />
      <path
        d="M24 12c-3 3-4.5 7.5-4.5 12s1.5 9 4.5 12M24 12c3 3 4.5 7.5 4.5 12s-1.5 9-4.5 12"
        stroke="#046EC5"
        strokeWidth="1.5"
      />
      <path d="M12 24h24" stroke="#046EC5" strokeWidth="1.5" />
      <path d="M13 19h22M13 29h22" stroke="#046EC5" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/* ── Type ────────────────────────────────────────────────────────────────── */

/** Small uppercase label flanked by two short rules. */
export function Eyebrow({
  children,
  dark = false,
  align = "center",
  className = "mb-3.5",
}: {
  children: ReactNode;
  dark?: boolean;
  align?: "center" | "start";
  className?: string;
}) {
  const c = dark ? "#BBDFFC" : "#046EC5";
  const rule = (
    <span
      aria-hidden
      // Start-aligned eyebrows sit beside other content and can wrap on a
      // phone; their rules only show where there is room.
      className={`${align === "start" ? "hidden sm:inline-block" : "inline-block"} shrink-0 rounded-sm`}
      style={{ width: 20, height: 1.5, background: c }}
    />
  );
  return (
    <div
      className={`${className} flex items-center gap-2 ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      {rule}
      <p
        className="m-0"
        style={{
          color: c,
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          lineHeight: 1.5,
        }}
      >
        {children}
      </p>
      {rule}
    </div>
  );
}

/** Section heading with one gradient accent word. */
export function Headline({
  copy,
  lang,
  as: Tag = "h2",
  dark = false,
  className = "",
  style,
}: {
  copy: HeadlineCopy;
  lang: Lang;
  as?: "h1" | "h2";
  dark?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [before, accent, after] = copy[lang];
  return (
    <Tag
      className={className}
      style={{
        fontSize: "clamp(28px,4vw,44px)",
        fontWeight: 700,
        color: dark ? "#fff" : "#101828",
        letterSpacing: lang === "km" ? 0 : "-0.88px",
        lineHeight: lh(lang, 1.15, 1.5),
        ...style,
      }}
    >
      {before}
      <span className={dark ? "grad-text-dark" : "grad-text"}>{accent}</span>
      {after}
    </Tag>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

export function GradientLink({
  href,
  children,
  className = "",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const pad = size === "sm" ? "9px 20px" : size === "lg" ? "13px 28px" : "12px 24px";
  const fs = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  return (
    <Link
      href={href}
      className={`ag-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold text-white transition-opacity hover:opacity-90 ${className}`}
      style={{ background: GRADIENT, padding: pad, fontSize: fs }}
    >
      {children}
    </Link>
  );
}

/* ── Floating chips ──────────────────────────────────────────────────────── */

export function VerifiedChip({
  lang,
  text,
  className = "",
  style,
}: {
  lang: Lang;
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`absolute z-10 rounded-xl text-left backdrop-blur-md ${className}`}
      style={{
        background: "rgba(255,255,255,0.96)",
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(4,110,197,0.13)",
        maxWidth: 210,
        ...style,
      }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: "#64E8C7" }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#0A7D63",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            lineHeight: 1.4,
          }}
        >
          {COMMON.verifiedSource[lang]}
        </span>
      </div>
      <p className="m-0" style={{ fontSize: 11, color: "#4A5565", lineHeight: lh(lang, 1.45, 1.7) }}>
        {text}
      </p>
    </div>
  );
}

export function BothChannelsChip({
  lang,
  className = "",
  style,
}: {
  lang: Lang;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`absolute z-10 flex items-center gap-2.5 rounded-xl backdrop-blur-md ${className}`}
      style={{
        background: "rgba(255,255,255,0.96)",
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(4,110,197,0.13)",
        ...style,
      }}
    >
      <TelegramIcon size={22} />
      <MessengerIcon size={22} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "#101828", lineHeight: 1.4 }}>
        {COMMON.availableOnBoth[lang]}
      </span>
    </div>
  );
}

/* ── Phone mock-up ───────────────────────────────────────────────────────── */

/**
 * A tilted phone showing one SuperAsk exchange. Decorative: the same content
 * is described in text nearby, so it is hidden from assistive technology.
 */
export function PhoneMock({
  demo,
  lang,
  size = "lg",
}: {
  demo: PhoneDemo;
  lang: Lang;
  size?: "lg" | "md";
}) {
  const lg = size === "lg";
  const accent = demo.accent;
  return (
    <div
      aria-hidden
      className="relative w-full"
      style={{
        maxWidth: lg ? 280 : 260,
        // The Figma fades the phone's top edge; kept gentler here so the
        // citizen's question bubble stays readable.
        WebkitMaskImage: "linear-gradient(to top, #fff 0%, #fff 62%, rgba(255,255,255,0.35) 100%)",
        maskImage: "linear-gradient(to top, #fff 0%, #fff 62%, rgba(255,255,255,0.35) 100%)",
      }}
    >
      <div
        style={{
          background: "#0F1724",
          borderRadius: lg ? 40 : 38,
          padding: lg ? "18px 14px 32px" : "16px 12px 28px",
          boxShadow: "0 32px 96px rgba(0,0,0,0.22)",
          transform: lg
            ? "perspective(900px) rotateY(-6deg) rotateX(3deg)"
            : "perspective(900px) rotateY(-4deg) rotateX(2deg)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-center"
          style={{ width: lg ? 72 : 64, height: lg ? 22 : 20, background: "#000", borderRadius: 11, marginBottom: lg ? 14 : 12 }}
        >
          <div className="rounded-full" style={{ width: 7, height: 7, background: "#2A2A2A" }} />
        </div>

        <div style={{ background: "#F8FAFC", borderRadius: lg ? 28 : 26, padding: lg ? 14 : 13, minHeight: lg ? 340 : 300 }}>
          <div className="mb-2.5 text-center">
            <span style={{ fontSize: 10, color: "#99A1AF", background: "#F1F5F9", padding: "3px 10px", borderRadius: 20 }}>
              {COMMON.today[lang]}
            </span>
          </div>

          <div className="mb-2.5 flex justify-end">
            <div style={{ background: accent, color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "9px 13px", maxWidth: "84%", fontSize: lg ? 12 : 11 }}>
              <p className="m-0 font-km" style={{ lineHeight: 1.6 }}>
                {demo.queryKm}
              </p>
              <p className="m-0" style={{ marginTop: 3, fontSize: 10, opacity: 0.8, lineHeight: 1.4 }}>
                {demo.queryEn}
              </p>
            </div>
          </div>

          <div className="flex gap-[7px]">
            <div
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 26, height: 26, background: `linear-gradient(135deg,${accent},#64E8C7)` }}
            >
              <span style={{ fontSize: 9, fontWeight: 800, color: "#fff" }}>SA</span>
            </div>
            <div
              className="flex-1"
              style={{ background: "#fff", borderRadius: "4px 16px 16px 16px", padding: "9px 12px", fontSize: 11, color: "#101828", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
            >
              <p className="m-0" style={{ marginBottom: 7, fontWeight: 700, fontSize: 11, lineHeight: lh(lang, 1.4, 1.7) }}>
                {demo.title[lang]}
              </p>
              {demo.rows.map((r) => (
                <div key={r.label.en} className="flex gap-[5px]" style={{ marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: accent, minWidth: 60, fontSize: 10, lineHeight: lh(lang, 1.45, 1.7) }}>
                    {r.label[lang]}
                  </span>
                  <span style={{ color: "#4A5565", fontSize: 10, lineHeight: lh(lang, 1.45, 1.7) }}>{r.val[lang]}</span>
                </div>
              ))}
              <div className="flex items-center gap-[5px]" style={{ marginTop: 8, padding: "5px 9px", background: "#EFF6FF", borderRadius: 8 }}>
                <span className="shrink-0 rounded-full" style={{ width: 5, height: 5, background: "#64E8C7" }} />
                <span style={{ fontSize: 9, color: "#046EC5", lineHeight: lh(lang, 1.3, 1.6) }}>{demo.source[lang]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
