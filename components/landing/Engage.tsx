"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Linkedin, Lock, ShieldCheck, UserRound } from "lucide-react";
import type { Lang } from "@/lib/ui/marketing";
import { ABOUT, CHANNELS, COMMON, CTA, EXAMPLES, FAQS, TOPICS, TRUST } from "@/lib/ui/landing";
import { MESSENGER_URL, TELEGRAM_HANDLE, TELEGRAM_URL } from "@/lib/ui/channels";
import { Eyebrow, GRADIENT, Headline, MessengerIcon, TelegramIcon, WebIcon, askHref, lh } from "./primitives";

/* ── Examples ────────────────────────────────────────────────────────────── */

export function Examples({ lang }: { lang: Lang }) {
  return (
    <section id="examples" className="bg-white px-6 py-24 text-center">
      <div className="mx-auto max-w-[860px]">
        <Eyebrow>{EXAMPLES.eyebrow[lang]}</Eyebrow>
        <Headline copy={EXAMPLES.title} lang={lang} style={{ maxWidth: 560, margin: "0 auto 16px" }} />
        <p style={{ fontSize: 15, color: "#4A5565", marginBottom: 48, lineHeight: lh(lang, 1.6) }}>{EXAMPLES.body[lang]}</p>

        <div className="flex flex-wrap justify-center gap-3.5">
          {TOPICS.map((t) => (
            <Link
              key={t.en}
              href={askHref(t.ask[lang])}
              className="sa-lift flex flex-col items-center gap-1 rounded-[14px] bg-white px-[22px] py-3.5"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 6px 18px rgba(0,0,0,0.05)", border: "1.5px solid transparent" }}
            >
              <span className="font-km" style={{ fontSize: 13, fontWeight: 700, color: "#101828", lineHeight: 1.7 }}>
                {t.km}
              </span>
              <span style={{ fontSize: 12, color: "#99A1AF", lineHeight: 1.4 }}>{t.en}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Channels ────────────────────────────────────────────────────────────── */

function QrGlyph({ accent, bg }: { accent: string; bg: string }) {
  return (
    <div aria-hidden className="grid shrink-0 grid-cols-3 gap-[3px] rounded-[10px] p-2" style={{ width: 72, height: 72, background: bg }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="rounded-[2px]"
          style={{ background: [0, 2, 6, 8].includes(i) ? accent : i === 4 ? "#fff" : `${accent}55` }}
        />
      ))}
    </div>
  );
}

export function Channels({ lang }: { lang: Lang }) {
  const cards = [
    {
      Logo: WebIcon,
      label: CHANNELS.web.label[lang],
      tag: CHANNELS.web.tag[lang],
      sub: CHANNELS.web.sub[lang],
      cta: CHANNELS.web.cta[lang],
      href: "/chat",
      external: false,
      accent: "#046EC5",
      bg: "#F0F9FF",
    },
    {
      Logo: TelegramIcon,
      label: CHANNELS.telegram.label[lang],
      tag: TELEGRAM_HANDLE,
      sub: CHANNELS.telegram.sub[lang],
      cta: CHANNELS.telegram.cta[lang],
      href: TELEGRAM_URL,
      external: true,
      accent: "#1C93D1",
      bg: "#F0FAFF",
    },
    {
      Logo: MessengerIcon,
      label: CHANNELS.messenger.label[lang],
      tag: CHANNELS.messenger.tag[lang],
      sub: CHANNELS.messenger.sub[lang],
      cta: CHANNELS.messenger.cta[lang],
      href: MESSENGER_URL,
      external: true,
      accent: "#006AFF",
      bg: "#F0F5FF",
    },
  ];

  return (
    <section id="channels" className="px-6 py-24" style={{ background: "#FAFBFC" }}>
      <div className="mx-auto max-w-[1100px] text-center">
        <Eyebrow>{CHANNELS.eyebrow[lang]}</Eyebrow>
        <Headline copy={CHANNELS.title} lang={lang} style={{ maxWidth: 500, margin: "0 auto 16px" }} />
        <p style={{ fontSize: 15, color: "#4A5565", marginBottom: 60, lineHeight: lh(lang, 1.6) }}>{CHANNELS.body[lang]}</p>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(({ Logo, ...c }) => (
            <div
              key={c.href}
              className="flex flex-col gap-4 rounded-[20px] bg-white p-8 text-left transition-shadow"
              style={{ border: `1.5px solid ${c.bg}`, boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 8px 32px ${c.accent}22`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.05)")}
            >
              <div className="flex items-center gap-3.5">
                <Logo size={52} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#101828", lineHeight: 1.4 }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: c.accent, fontWeight: 600, lineHeight: 1.5 }}>{c.tag}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#4A5565", lineHeight: lh(lang, 1.65), margin: 0 }}>{c.sub}</p>
              <div className="mt-auto flex items-center gap-4">
                <QrGlyph accent={c.accent} bg={c.bg} />
                <a
                  href={c.href}
                  {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-1 hover:underline"
                  style={{ color: c.accent, fontWeight: 700, fontSize: 14, lineHeight: 1.5 }}
                >
                  {c.cta} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Trust & safety ──────────────────────────────────────────────────────── */

export function Trust({ lang }: { lang: Lang }) {
  return (
    <section className="bg-white px-6 py-24 text-center">
      <div className="mx-auto max-w-[900px]">
        <Eyebrow>{TRUST.eyebrow[lang]}</Eyebrow>
        <Headline copy={TRUST.title} lang={lang} style={{ maxWidth: 580, margin: "0 auto 64px" }} />

        <div className="grid gap-8 md:grid-cols-2">
          {TRUST.cards.map((c) => {
            const Icon = c.icon === "shield" ? ShieldCheck : Lock;
            return (
              <div key={c.title.en} className="rounded-2xl p-8 text-left" style={{ background: "#FAFBFC", border: "1px solid #F0F4F8" }}>
                <Icon size={28} strokeWidth={1.6} color="#046EC5" className="mb-3.5" aria-hidden />
                <h3 style={{ fontSize: 19, fontWeight: 700, color: "#101828", margin: "0 0 12px", lineHeight: lh(lang, 1.35, 1.6) }}>{c.title[lang]}</h3>
                <p style={{ fontSize: 15, color: "#4A5565", margin: 0, lineHeight: lh(lang, 1.65) }}>{c.body[lang]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── About us ────────────────────────────────────────────────────────────── */

export function About({ lang }: { lang: Lang }) {
  return (
    <section id="about" className="px-6 py-24 text-center" style={{ background: "#FAFBFC" }}>
      <div className="mx-auto max-w-[1000px]">
        <Eyebrow>{ABOUT.eyebrow[lang]}</Eyebrow>
        <Headline copy={ABOUT.title} lang={lang} style={{ maxWidth: 560, margin: "0 auto 20px" }} />
        <p className="mx-auto" style={{ fontSize: 16, color: "#4A5565", lineHeight: lh(lang, 1.65), maxWidth: 620, margin: "0 auto 64px" }}>
          {ABOUT.body[lang]}
        </p>

        <div className="mb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ABOUT.team.map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-4 rounded-xl bg-white px-5 py-4"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: 52,
                  height: 52,
                  background: "linear-gradient(135deg,#EFF6FF,#BBDFFC)",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 8px rgba(4,110,197,0.10)",
                }}
              >
                <UserRound size={24} strokeWidth={1.5} color="#046EC5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p style={{ fontWeight: 700, fontSize: 14, color: "#101828", margin: "0 0 2px", lineHeight: 1.4 }}>{m.name}</p>
                <p style={{ fontSize: 12, color: "#99A1AF", margin: 0, lineHeight: lh(lang, 1.4, 1.7) }}>{m.role[lang]}</p>
              </div>
              <a
                href="#"
                aria-label={`${m.name} on LinkedIn`}
                className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity hover:opacity-100"
                style={{ color: "#046EC5", fontSize: 12 }}
              >
                <Linkedin size={13} aria-hidden />
                LinkedIn
              </a>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "#99A1AF", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1.5 }}>
          {ABOUT.partnersLabel[lang]}
        </p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
          {ABOUT.partners.map((p) => (
            <div
              key={p}
              className="flex items-center justify-center rounded-[10px] bg-white px-4"
              style={{ minWidth: 130, height: 44, border: "1px solid #E8EDF2" }}
            >
              <span style={{ fontSize: 12, color: "#99A1AF", fontWeight: 600, letterSpacing: "0.01em" }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQs ────────────────────────────────────────────────────────────────── */

export function Faqs({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faqs" className="bg-white px-6 py-24 text-center">
      <div className="mx-auto max-w-[640px]">
        <Eyebrow>{FAQS.eyebrow[lang]}</Eyebrow>
        <Headline copy={FAQS.title} lang={lang} style={{ margin: "0 auto 48px" }} />

        <div>
          {FAQS.items.map((f, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            return (
              <div key={f.q.en} className="py-5 text-left" style={{ borderBottom: "1px solid #E8EDF2" }}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#101828", lineHeight: lh(lang, 1.5, 1.7) }}>{f.q[lang]}</span>
                  <span
                    className="flex shrink-0 items-center justify-center rounded-full transition-colors"
                    style={{ width: 28, height: 28, background: isOpen ? "#EFF6FF" : "#F8FAFC" }}
                  >
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      color={isOpen ? "#046EC5" : "#99A1AF"}
                      style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                      aria-hidden
                    />
                  </span>
                </button>
                {isOpen && (
                  <p id={panelId} className="ag-fade" style={{ fontSize: 15, color: "#4A5565", lineHeight: lh(lang, 1.65), margin: "12px 0 0" }}>
                    {f.a[lang]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────────────────────── */

export function FinalCta({ lang }: { lang: Lang }) {
  const glass = {
    background: "rgba(255,255,255,0.15)",
    border: "1.5px solid rgba(255,255,255,0.3)",
    padding: "14px 28px",
    fontSize: 15,
  } as const;
  return (
    <section className="relative overflow-hidden px-6 py-24 text-center" style={{ background: GRADIENT }}>
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{ top: -80, right: -80, width: 360, height: 360, background: "rgba(255,255,255,0.06)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{ bottom: -60, left: -60, width: 280, height: 280, background: "rgba(255,255,255,0.04)" }}
      />
      <div className="relative mx-auto max-w-[640px]">
        <h2
          style={{
            fontSize: "clamp(32px,4vw,48px)",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: lang === "km" ? 0 : "-1px",
            marginBottom: 16,
            lineHeight: lh(lang, 1.1, 1.5),
          }}
        >
          {CTA.title[lang]}
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.9)", marginBottom: 48, lineHeight: lh(lang, 1.6) }}>{CTA.body[lang]}</p>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/chat"
            className="ag-press flex items-center gap-2 rounded-[10px] bg-white transition-opacity hover:opacity-90"
            style={{ color: "#046EC5", fontWeight: 700, fontSize: 15, padding: "14px 32px" }}
          >
            <WebIcon size={20} />
            {COMMON.openWeb[lang]}
          </Link>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ag-press flex items-center gap-2 rounded-[10px] font-semibold text-white backdrop-blur-sm"
            style={glass}
          >
            <TelegramIcon size={22} />
            Telegram
          </a>
          <a
            href={MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ag-press flex items-center gap-2 rounded-[10px] font-semibold text-white backdrop-blur-sm"
            style={glass}
          >
            <MessengerIcon size={22} />
            Messenger
          </a>
        </div>
      </div>
    </section>
  );
}
