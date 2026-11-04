import { Building2, FileText, Globe, MessageSquare } from "lucide-react";
import type { Lang } from "@/lib/ui/marketing";
import { COMPARE, HERO, HERO_DEMO, STATS, WHY } from "@/lib/ui/landing";
import {
  BothChannelsChip,
  Eyebrow,
  GRADIENT,
  GradientLink,
  Headline,
  MessengerIcon,
  PhoneMock,
  TelegramIcon,
  VerifiedChip,
  lh,
} from "./primitives";

/* ── Hero ────────────────────────────────────────────────────────────────── */

function CambodiaFlag() {
  return (
    <svg
      width="28"
      height="19"
      viewBox="0 0 28 19"
      className="shrink-0"
      style={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
      aria-hidden
    >
      <rect x="0" y="0" width="28" height="4.75" fill="#032EA1" />
      <rect x="0" y="4.75" width="28" height="9.5" fill="#E00025" />
      <rect x="0" y="14.25" width="28" height="4.75" fill="#032EA1" />
    </svg>
  );
}

export function Hero({ lang }: { lang: Lang }) {
  const [before, accent, after] = HERO.title[lang];
  return (
    <section className="relative overflow-hidden bg-white px-6 pt-14 sm:pt-20">
      {/* Flag-tinted wash: blue / red / blue, barely there. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: "18%", background: "linear-gradient(to bottom, rgba(3,46,161,0.09), rgba(3,46,161,0.04))" }}
        />
        <div className="absolute inset-x-0" style={{ top: "18%", bottom: "18%", background: "rgba(220,0,37,0.04)" }} />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "18%", background: "linear-gradient(to top, rgba(3,46,161,0.09), rgba(3,46,161,0.04))" }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(#BBDFFC 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.32,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0) 40%, #fff 100%)" }}
      />

      <div className="relative z-[2] mx-auto grid max-w-[1200px] items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className="text-center md:text-left">
          <div className="mb-3.5 flex items-center justify-center gap-2.5 md:justify-start">
            <CambodiaFlag />
            <Eyebrow align="start" className="mb-0">
              {HERO.eyebrow[lang]}
            </Eyebrow>
          </div>

          <h1
            style={{
              fontSize: "clamp(32px, 4vw, 52px)",
              fontWeight: 700,
              color: "#000",
              letterSpacing: lang === "km" ? 0 : "-1.04px",
              lineHeight: lh(lang, 1.1, 1.45),
              margin: "0 0 20px",
            }}
          >
            {before}
            <span className="grad-text">{accent}</span>
            {after}
          </h1>

          <p
            className="mx-auto md:mx-0"
            style={{ fontSize: 16, color: "#4A5565", lineHeight: lh(lang, 1.65), margin: "0 0 32px", maxWidth: 480 }}
          >
            {HERO.body[lang]}
          </p>

          <div className="mb-5 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <GradientLink href="/chat" size="lg">
              {HERO.cta[lang]}
            </GradientLink>
            <div className="flex items-center gap-2">
              <TelegramIcon size={32} />
              <MessengerIcon size={32} />
              <span style={{ fontSize: 13, color: "#99A1AF", lineHeight: 1.5 }}>{HERO.orChat[lang]}</span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "#99A1AF", lineHeight: lh(lang, 1.5) }}>{HERO.fineprint[lang]}</p>
        </div>

        <div className="relative flex items-end justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 480, height: 480, background: "radial-gradient(circle, #EFF6FF 0%, transparent 70%)" }}
          />
          <VerifiedChip lang={lang} text={HERO.chipSource[lang]} className="hidden md:block" style={{ top: "12%", left: -20 }} />
          <BothChannelsChip lang={lang} className="hidden md:flex" style={{ top: "35%", right: -20 }} />
          <div className="relative z-[5] flex w-full justify-center">
            <PhoneMock demo={HERO_DEMO} lang={lang} size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Stats band ──────────────────────────────────────────────────────────── */

const STAT_ICONS = { building: Building2, file: FileText, chat: MessageSquare, globe: Globe } as const;

export function Stats({ lang }: { lang: Lang }) {
  return (
    <section
      className="px-6 py-16"
      style={{ background: "#F0F9FF", borderTop: "1px solid #E0F0FF", borderBottom: "1px solid #E0F0FF" }}
    >
      <div className="mx-auto max-w-[900px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.items.map((s, i) => {
            const Icon = STAT_ICONS[s.icon];
            return (
              <div
                key={s.label.en}
                className={`px-8 py-7 text-center ${i < 3 ? "border-b sm:border-b-0 lg:border-r" : ""} ${i % 2 === 0 ? "sm:border-r" : ""}`}
                style={{ borderColor: "#D0E8F8" }}
              >
                <Icon size={22} strokeWidth={1.6} color="#046EC5" className="mx-auto mb-1.5" aria-hidden />
                <div
                  style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: "#046EC5", letterSpacing: "-1px", lineHeight: 1 }}
                >
                  {s.n}
                </div>
                <div style={{ fontSize: 13, color: "#4A5565", marginTop: 6, lineHeight: lh(lang, 1.4, 1.7) }}>{s.label[lang]}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center" style={{ fontSize: 12, color: "#99A1AF", lineHeight: 1.6 }}>
          {STATS.caption[lang]}
        </p>
      </div>
    </section>
  );
}

/* ── Why ─────────────────────────────────────────────────────────────────── */

export function Why({ lang }: { lang: Lang }) {
  return (
    <section className="bg-white px-6 py-24 text-center">
      <div className="mx-auto max-w-[1100px]">
        <Eyebrow>{WHY.eyebrow[lang]}</Eyebrow>
        <Headline copy={WHY.title} lang={lang} className="mx-auto" style={{ maxWidth: 640, margin: "0 auto 64px" }} />

        <div className="mb-[72px] grid gap-6 text-left md:grid-cols-3">
          {WHY.cards.map((c) => (
            <div
              key={c.n}
              style={{ borderLeft: `3px solid ${c.accent}`, padding: "24px 28px", background: "#FAFBFC", borderRadius: "0 12px 12px 0" }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: c.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                  lineHeight: 1.4,
                }}
              >
                {c.n}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#101828", margin: "0 0 10px", lineHeight: lh(lang, 1.35, 1.6) }}>
                {c.label[lang]}
              </h3>
              <p style={{ fontSize: 14, color: "#4A5565", margin: 0, lineHeight: lh(lang, 1.65) }}>{c.sub[lang]}</p>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl px-7 py-9 text-left sm:px-12 sm:py-10" style={{ background: GRADIENT }}>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0"
            style={{ width: 200, height: 200, borderRadius: "0 16px 0 200px", background: "rgba(255,255,255,0.06)" }}
          />
          <blockquote
            className="relative m-0"
            style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 600, color: "#fff", lineHeight: lh(lang, 1.45, 1.8), maxWidth: 600 }}
          >
            {WHY.quote[lang]}
          </blockquote>
        </div>
      </div>
    </section>
  );
}

/* ── Comparison table ────────────────────────────────────────────────────── */

function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="6" stroke="#D0D5DD" strokeWidth="1.2" />
      <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#D0D5DD" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="6" fill="#64E8C7" fillOpacity="0.15" stroke="#35C1A7" strokeWidth="1.2" />
      <path d="M4.5 7l2 2 3-3" stroke="#0A7D63" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Compare({ lang }: { lang: Lang }) {
  const head = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "14px 20px",
    lineHeight: 1.5,
  };
  return (
    <section className="bg-white px-6 pb-24 text-center">
      <div className="mx-auto max-w-[900px]">
        <Eyebrow>{COMPARE.eyebrow[lang]}</Eyebrow>
        <Headline copy={COMPARE.title} lang={lang} style={{ maxWidth: 560, margin: "0 auto 56px" }} />

        <div className="overflow-hidden rounded-2xl text-left" style={{ border: "1px solid #E8EDF2" }} role="table">
          <div className="grid grid-cols-[1fr_1fr_1fr]" style={{ background: "#F8FAFC", borderBottom: "1px solid #E8EDF2" }} role="row">
            <div role="columnheader" style={{ ...head, color: "#99A1AF" }}>
              {COMPARE.head.topic[lang]}
            </div>
            <div role="columnheader" style={{ ...head, color: "#99A1AF", borderLeft: "1px solid #E8EDF2" }}>
              {COMPARE.head.without[lang]}
            </div>
            <div role="columnheader" style={{ ...head, color: "#046EC5", borderLeft: "1px solid #E8EDF2", background: "#F0F9FF" }}>
              {COMPARE.head.with[lang]}
            </div>
          </div>
          {COMPARE.rows.map((r, i) => (
            <div
              key={r.topic.en}
              role="row"
              className="grid grid-cols-[1fr_1fr_1fr]"
              style={{ borderBottom: i < COMPARE.rows.length - 1 ? "1px solid #F1F5F9" : "none" }}
            >
              <div role="cell" className="px-3 py-4 sm:px-5" style={{ fontSize: 13, fontWeight: 600, color: "#101828", lineHeight: lh(lang, 1.5) }}>
                {r.topic[lang]}
              </div>
              <div
                role="cell"
                className="flex items-center gap-2 px-3 py-4 sm:px-5"
                style={{ fontSize: 13, color: "#99A1AF", borderLeft: "1px solid #F1F5F9", lineHeight: lh(lang, 1.5) }}
              >
                <Cross />
                {r.old[lang]}
              </div>
              <div
                role="cell"
                className="flex items-center gap-2 px-3 py-4 sm:px-5"
                style={{
                  fontSize: 13,
                  color: "#046EC5",
                  fontWeight: 500,
                  borderLeft: "1px solid #E8EDF2",
                  background: "#F0F9FF",
                  lineHeight: lh(lang, 1.5),
                }}
              >
                <Tick />
                {r.ours[lang]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
