"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  Languages,
  LifeBuoy,
  Scale,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { SuperAskLogo, MarketingShell } from "@/components/site";
import { MARKETING, t, type Lang } from "@/lib/ui/marketing";

const FEATURE_ICONS = [
  BookOpenCheck,
  FileText,
  Languages,
  LifeBuoy,
  Scale,
  Shield,
];

const AGENCIES = ["DGC", "MPWT", "MoI", "MoC"] as const;

type ChatPhase = "idle" | "question" | "typing" | "streaming" | "done";

/** Split into word-ish chunks so Khmer and English both stream like model tokens. */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

function HeroPreview({ lang }: { lang: Lang }) {
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [streamed, setStreamed] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);

  const fullAnswer = t(MARKETING.previewAnswer, lang);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    if (mq.matches) {
      setPhase("done");
      setStreamed(fullAnswer);
      return;
    }

    let cancelled = false;
    let timeoutId = 0;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, ms);
      });

    const streamAnswer = async () => {
      const tokens = tokenize(fullAnswer);
      let built = "";
      setStreamed("");
      setPhase("streaming");

      for (const token of tokens) {
        if (cancelled) return;
        built += token;
        setStreamed(built);
        // Slight jitter so it feels like real token arrival, not a metronome.
        await wait(110 + Math.floor(Math.random() * 90));
      }

      if (!cancelled) setPhase("done");
    };

    const runLoop = async () => {
      while (!cancelled) {
        setPhase("idle");
        setStreamed("");
        await wait(600);
        if (cancelled) break;

        setPhase("question");
        await wait(900);
        if (cancelled) break;

        setPhase("typing");
        await wait(1100);
        if (cancelled) break;

        await streamAnswer();
        if (cancelled) break;

        await wait(3800);
      }
    };

    void runLoop();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [lang, fullAnswer]);

  const showQuestion =
    phase === "question" ||
    phase === "typing" ||
    phase === "streaming" ||
    phase === "done";
  const showTyping = phase === "typing";
  const showAnswer =
    phase === "streaming" || phase === "done" || reduceMotion;
  const showSource = phase === "done" || reduceMotion;
  const showCaret = phase === "streaming";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/20 bg-white text-left shadow-[0_20px_60px_rgba(0,20,50,0.35)]"
      aria-hidden
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--sa-line)", background: "var(--sa-page)" }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: "var(--sa-sky)" }}
        />
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--sa-ink-soft)" }}
        >
          SuperAsk
        </span>
      </div>

      <div className="flex min-h-[220px] flex-col justify-end gap-3 px-4 py-4 sm:min-h-[240px] sm:px-5 sm:py-5">
        {showQuestion && (
          <div className="chat-bubble-in flex justify-end">
            <p
              className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-snug text-white"
              style={{ background: "var(--sa-deep)" }}
            >
              {t(MARKETING.previewQuestion, lang)}
            </p>
          </div>
        )}

        {showTyping && (
          <div className="chat-bubble-in flex justify-start">
            <div
              className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border px-3.5 py-3"
              style={{
                borderColor: "var(--sa-line)",
                background: "#fff",
              }}
            >
              <span className="chat-dot" />
              <span className="chat-dot chat-dot-2" />
              <span className="chat-dot chat-dot-3" />
            </div>
          </div>
        )}

        {showAnswer && (
          <div
            className="chat-bubble-in rounded-2xl rounded-bl-md border px-3.5 py-3"
            style={{
              borderColor: "var(--sa-line)",
              background: "#fff",
            }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded"
                style={{ background: "var(--sa-deep)" }}
              >
                <ShieldCheck size={11} color="#fff" strokeWidth={2.5} />
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--sa-ink-faint)" }}
              >
                SuperAsk
              </span>
            </div>
            <p
              className="text-[13px] leading-snug"
              style={{ color: "var(--sa-ink)" }}
            >
              {streamed}
              {showCaret && <span className="chat-caret" />}
            </p>
            {showSource && (
              <p
                className="chat-bubble-in mt-2.5 border-t pt-2 text-[11px]"
                style={{
                  borderColor: "var(--sa-line-soft)",
                  color: "var(--sa-sky-deep)",
                }}
              >
                {t(MARKETING.previewSource, lang)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LandingBody({ lang }: { lang: Lang }) {
  return (
    <>
      {/* Hero — text left, visualization right */}
      <section
        className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden"
        style={{ background: "var(--sa-deep)" }}
      >
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid flex-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <h1 className="text-[1.7rem] font-bold leading-[1.4] text-white sm:text-[2.4rem] sm:leading-[1.35]">
                {t(MARKETING.heroTitleLead, lang)}{" "}
                <span className="text-white/95">
                  {t(MARKETING.heroTitleAccent, lang)}
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-[16px] lg:mx-0">
                {t(MARKETING.heroBody, lang)}
              </p>

              <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="ag-press inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-7 text-[15px] font-semibold"
                  style={{ color: "var(--sa-deep)" }}
                >
                  {t(MARKETING.start, lang)}
                  <ArrowRight size={16} strokeWidth={2.25} />
                </Link>
                <Link
                  href="/chat"
                  className="ag-press inline-flex min-h-12 items-center justify-center rounded-lg border border-white/35 px-7 text-[15px] font-medium text-white"
                >
                  {t(MARKETING.secondaryCta, lang)}
                </Link>
              </div>
            </div>

            {/* Right: visualization */}
            <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
              <HeroPreview lang={lang} />
            </div>
          </div>

          {/* Agency strip — centered across the full hero */}
          <div className="mt-12 text-center lg:mt-14">
            <p className="text-[12px] font-medium tracking-wide text-white/55">
              {t(MARKETING.usedBy, lang)}
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
              {AGENCIES.map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-white/15 px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-white/90"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6 sm:py-24" style={{ background: "#fff" }}>
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--sa-sky-deep)" }}
            >
              SuperAsk
            </p>
            <h2
              className="text-[1.45rem] font-bold sm:text-[1.85rem]"
              style={{ color: "var(--sa-ink)" }}
            >
              {t(MARKETING.featuresTitle, lang)}
            </h2>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MARKETING.features.map((feature, i) => {
              const Icon = FEATURE_ICONS[i]!;
              return (
                <div
                  key={feature.title.en}
                  className="rounded-2xl border p-5 sm:p-6"
                  style={{
                    borderColor: "var(--sa-line)",
                    background: "#fff",
                  }}
                >
                  <div
                    className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background:
                        "linear-gradient(145deg, var(--sa-sky-wash), var(--sa-deep-wash))",
                      color: "var(--sa-deep)",
                    }}
                  >
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <h3
                    className="text-[16px] font-semibold"
                    style={{ color: "var(--sa-ink)" }}
                  >
                    {t(feature.title, lang)}
                  </h3>
                  <p
                    className="mt-2 text-[14px] leading-relaxed"
                    style={{ color: "var(--sa-ink-soft)" }}
                  >
                    {t(feature.body, lang)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works — sequence, not marketing fluff */}
      <section
        className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24"
        style={{ background: "var(--sa-page)" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="text-[1.45rem] font-bold sm:text-[1.85rem]"
              style={{ color: "var(--sa-ink)" }}
            >
              {t(MARKETING.howTitle, lang)}
            </h2>
            <p
              className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed"
              style={{ color: "var(--sa-ink-soft)" }}
            >
              {t(MARKETING.howBody, lang)}
            </p>
          </div>

          <ol className="relative mt-14 grid gap-0 sm:grid-cols-4">
            {/* connector line on desktop */}
            <div
              className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 hidden h-px sm:block"
              style={{ background: "var(--sa-sky-line)" }}
              aria-hidden
            />
            {MARKETING.steps.map((step, i) => (
              <li
                key={step.title.en}
                className="relative flex gap-4 px-2 py-4 sm:flex-col sm:items-center sm:px-4 sm:text-center"
              >
                <span
                  className="relative z-[1] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white shadow-md"
                  style={{
                    background: "var(--sa-deep)",
                    boxShadow: "0 0 0 4px var(--sa-page)",
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <h3
                    className="text-[15px] font-semibold"
                    style={{ color: "var(--sa-ink)" }}
                  >
                    {t(step.title, lang)}
                  </h3>
                  <p
                    className="mt-1 text-[13px] leading-relaxed"
                    style={{ color: "var(--sa-ink-soft)" }}
                  >
                    {t(step.body, lang)}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="ag-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-7 text-[14px] font-semibold text-white"
              style={{ background: "var(--sa-deep)" }}
            >
              {t(MARKETING.start, lang)}
              <ArrowRight size={15} strokeWidth={2.25} />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-4 py-20 sm:px-6" style={{ background: "#fff" }}>
        <div
          className="mx-auto flex max-w-3xl flex-col items-center rounded-3xl px-6 py-12 text-center sm:px-12"
          style={{
            background:
              "linear-gradient(160deg, var(--sa-deep-wash) 0%, var(--sa-sky-wash) 100%)",
            border: "1px solid var(--sa-sky-line)",
          }}
        >
          <SuperAskLogo href="/" size="md" asLink={false} />
          <h2
            className="mt-6 text-[1.3rem] font-bold sm:text-[1.55rem]"
            style={{ color: "var(--sa-deep)" }}
          >
            {t(MARKETING.trustTitle, lang)}
          </h2>
          <p
            className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed"
            style={{ color: "var(--sa-ink-soft)" }}
          >
            {t(MARKETING.trustBody, lang)}
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="px-4 py-20 text-center sm:px-6 sm:py-24"
        style={{ background: "var(--sa-deep)" }}
      >
        <h2 className="text-[1.45rem] font-bold text-white sm:text-[1.9rem]">
          {t(MARKETING.ctaTitle, lang)}
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/chat"
            className="ag-press inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-[15px] font-semibold"
            style={{ color: "var(--sa-deep)" }}
          >
            {t(MARKETING.askNow, lang)}
            <ArrowRight size={16} strokeWidth={2.25} />
          </Link>
          <Link
            href="/register"
            className="ag-press inline-flex min-h-12 items-center justify-center rounded-lg border border-white/30 px-8 text-[15px] font-medium text-white/95"
          >
            {t(MARKETING.register, lang)}
          </Link>
        </div>
      </section>
    </>
  );
}

export default function LandingPage() {
  return (
    <MarketingShell>{(lang) => <LandingBody lang={lang} />}</MarketingShell>
  );
}
