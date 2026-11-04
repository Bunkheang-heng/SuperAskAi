import { Check, FileText, Search } from "lucide-react";
import type { Lang } from "@/lib/ui/marketing";
import { ANATOMY, COMMON, FEATURES, HOW, IN_ACTION, WEB } from "@/lib/ui/landing";
import { SuperAskLogo } from "@/components/site/SuperAskLogo";
import {
  BothChannelsChip,
  Eyebrow,
  GRADIENT,
  GradientLink,
  Headline,
  PhoneMock,
  VerifiedChip,
  WebIcon,
  lh,
} from "./primitives";

/* ── How it works ────────────────────────────────────────────────────────── */

function StepDot({ n }: { n: number }) {
  return (
    <div
      className="z-[1] mx-auto flex shrink-0 items-center justify-center rounded-full"
      style={{ width: 56, height: 56, background: GRADIENT }}
    >
      <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{n}</span>
    </div>
  );
}

export function HowItWorks({ lang }: { lang: Lang }) {
  return (
    <section id="how-it-works" className="px-6 py-24" style={{ background: "#FAFBFC" }}>
      <div className="mx-auto max-w-[860px] text-center">
        <Eyebrow>{HOW.eyebrow[lang]}</Eyebrow>
        <Headline copy={HOW.title} lang={lang} style={{ maxWidth: 560, margin: "0 auto 72px" }} />

        <div className="relative">
          <div
            aria-hidden
            className="absolute left-1/2 hidden -translate-x-1/2 sm:block"
            style={{ top: 28, bottom: 28, width: 2, background: "linear-gradient(to bottom,#046EC5,#64E8C7)", opacity: 0.25 }}
          />
          <ol className="m-0 flex list-none flex-col gap-12 p-0">
            {HOW.steps.map((s, i) => {
              const left = i % 2 === 0;
              const text = (
                <div className={`text-left ${left ? "sm:text-right" : "sm:text-left"}`}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: "#101828", margin: "0 0 6px", lineHeight: lh(lang, 1.4, 1.7) }}>
                    {s.label[lang]}
                  </p>
                  <p style={{ fontSize: 14, color: "#4A5565", margin: 0, lineHeight: lh(lang, 1.55) }}>{s.detail[lang]}</p>
                </div>
              );
              // Mobile: dot, then text. Desktop: text alternates sides of the spine.
              const spacer = <div aria-hidden className="hidden sm:block" />;
              return (
                <li
                  key={s.label.en}
                  className="grid grid-cols-[56px_1fr] items-center gap-3.5 sm:grid-cols-[1fr_56px_1fr] sm:gap-6"
                >
                  {left ? (
                    <>
                      <div className="order-2 sm:order-1">{text}</div>
                      <div className="order-1 sm:order-2">
                        <StepDot n={i + 1} />
                      </div>
                      <div aria-hidden className="order-3 hidden sm:block" />
                    </>
                  ) : (
                    <>
                      {spacer}
                      <StepDot n={i + 1} />
                      {text}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div
          className="mt-14 inline-flex flex-col items-center gap-4 rounded-xl bg-white px-7 py-[18px] sm:flex-row sm:gap-6"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
        >
          <div className="text-center">
            <div style={{ fontSize: 11, color: "#99A1AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>
              {HOW.typical[lang]}
            </div>
            <div style={{ fontSize: 13, color: "#4A5565", lineHeight: lh(lang, 1.5) }}>{HOW.typicalFlow[lang]}</div>
          </div>
          <div aria-hidden className="hidden sm:block" style={{ width: 1, height: 32, background: "#D0D5DD" }} />
          <div className="text-center">
            <div
              style={{ fontSize: 11, color: "#046EC5", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 3 }}
            >
              SuperAsk
            </div>
            <div style={{ fontSize: 13, color: "#101828", fontWeight: 500, lineHeight: lh(lang, 1.5) }}>{HOW.oursFlow[lang]}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Key features (dark band) ────────────────────────────────────────────── */

const SCREEN = { background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 14, fontSize: 11 } as const;

function CrawlerScreen({ lang }: { lang: Lang }) {
  return (
    <div style={SCREEN}>
      <div style={{ fontWeight: 600, color: "#fff", marginBottom: 10, fontSize: 12 }}>{FEATURES.monitored[lang]}</div>
      {FEATURES.monitoredList.map((m, i) => (
        <div
          key={m.en}
          className="flex items-center gap-2.5 py-1.5"
          style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
        >
          <div className="flex shrink-0 items-center justify-center" style={{ width: 22, height: 22, background: "rgba(4,110,197,0.4)", borderRadius: 6 }}>
            <span style={{ fontSize: 9, color: "#BBDFFC", fontWeight: 700 }}>M</span>
          </div>
          <span style={{ color: "#D0D5DD", lineHeight: lh(lang, 1.4, 1.7) }}>{m[lang]}</span>
          <span className="ml-auto rounded-full" style={{ width: 6, height: 6, background: "#64E8C7" }} />
        </div>
      ))}
    </div>
  );
}

function QueueScreen({ lang }: { lang: Lang }) {
  return (
    <div style={SCREEN}>
      <div style={{ fontWeight: 600, color: "#fff", marginBottom: 10, fontSize: 12 }}>{FEATURES.queue[lang]}</div>
      {FEATURES.queueList.map((q) => (
        <div key={q.s} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="flex-1" style={{ color: "#D0D5DD" }}>
            {q.s}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: q.ok ? "#64E8C7" : "#99A1AF",
              background: q.ok ? "rgba(100,232,199,0.15)" : "rgba(255,255,255,0.06)",
              padding: "2px 8px",
              borderRadius: 20,
              lineHeight: 1.6,
            }}
          >
            {q.ok ? FEATURES.verified[lang] : FEATURES.excluded[lang]}
          </span>
        </div>
      ))}
    </div>
  );
}

function CitedScreen({ lang }: { lang: Lang }) {
  return (
    <div style={SCREEN}>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#D0D5DD", lineHeight: lh(lang, 1.4, 1.7) }}>{FEATURES.citedClaim[lang]}</p>
      <div style={{ background: "rgba(4,110,197,0.25)", borderRadius: 8, padding: "8px 10px", borderLeft: "2px solid #64E8C7" }}>
        <div style={{ fontWeight: 700, color: "#BBDFFC", fontSize: 11, lineHeight: 1.6 }}>{FEATURES.citedMinistry[lang]}</div>
        <div style={{ color: "#99A1AF", fontSize: 10, marginTop: 2, lineHeight: lh(lang, 1.5, 1.7) }}>{FEATURES.citedMeta[lang]}</div>
      </div>
    </div>
  );
}

const FEATURE_ICONS = [Search, Check, FileText];
const FEATURE_SCREENS = [CrawlerScreen, QueueScreen, CitedScreen];

export function KeyFeatures({ lang }: { lang: Lang }) {
  return (
    <section className="relative overflow-hidden px-6 py-24" style={{ background: "#1E2939" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0"
        style={{ width: 340, height: 340, backgroundImage: "radial-gradient(rgba(187,223,252,0.15) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0"
        style={{ width: 240, height: 240, backgroundImage: "radial-gradient(rgba(53,193,167,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
      />
      <div className="relative mx-auto max-w-[1200px] text-center">
        <Eyebrow dark>{FEATURES.eyebrow[lang]}</Eyebrow>
        <Headline copy={FEATURES.title} lang={lang} dark style={{ maxWidth: 520, margin: "0 auto 72px" }} />

        <div className="grid items-start gap-5 md:grid-cols-3">
          {FEATURES.cards.map((c, i) => {
            const Icon = FEATURE_ICONS[i];
            const Screen = FEATURE_SCREENS[i];
            return (
              <div
                key={c.title.en}
                className={`rounded-2xl p-7 text-left ${i === 1 ? "md:mt-8" : ""}`}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <div className="mb-3.5 flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: GRADIENT }}>
                  <Icon size={18} color="#fff" strokeWidth={2} aria-hidden />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 8px", lineHeight: lh(lang, 1.35, 1.6) }}>{c.title[lang]}</h3>
                <p style={{ fontSize: 14, color: "#99A1AF", lineHeight: lh(lang, 1.65), margin: "0 0 18px" }}>{c.body[lang]}</p>
                <Screen lang={lang} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── See it in action ────────────────────────────────────────────────────── */

export function InAction({ lang }: { lang: Lang }) {
  return (
    <section className="px-6 py-24" style={{ background: "#F0F9FF", borderTop: "1px solid #E0F0FF", borderBottom: "1px solid #E0F0FF" }}>
      <div className="mx-auto max-w-[1200px] text-center">
        <Eyebrow>{IN_ACTION.eyebrow[lang]}</Eyebrow>
        <Headline copy={IN_ACTION.title} lang={lang} style={{ maxWidth: 560, margin: "0 auto 16px" }} />
        <p className="mx-auto" style={{ fontSize: 15, color: "#4A5565", maxWidth: 520, margin: "0 auto 72px", lineHeight: lh(lang, 1.6) }}>
          {IN_ACTION.body[lang]}
        </p>

        <div className="grid items-end gap-12 md:grid-cols-3">
          {IN_ACTION.demos.map((d, i) => (
            <div key={d.title.en} className={i === 1 ? "md:-translate-y-6" : ""}>
              <div className="relative flex justify-center">
                <VerifiedChip lang={lang} text={d.chip[lang]} className="hidden lg:block" style={{ top: 24, left: -8, maxWidth: 200, padding: "9px 14px" }} />
                <BothChannelsChip lang={lang} className="hidden lg:flex" style={{ top: 110, right: -8, padding: "9px 13px" }} />
                <PhoneMock demo={d} lang={lang} size="md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Web experience ──────────────────────────────────────────────────────── */

export function WebExperience({ lang }: { lang: Lang }) {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto grid max-w-[1100px] items-center gap-14 md:grid-cols-2 md:gap-[72px]">
        <div>
          <Eyebrow align="start">{WEB.eyebrow[lang]}</Eyebrow>
          <Headline
            copy={WEB.title}
            lang={lang}
            style={{ fontSize: "clamp(26px,3.5vw,40px)", letterSpacing: lang === "km" ? 0 : "-0.8px", margin: "0 0 20px" }}
          />
          <p style={{ fontSize: 15, color: "#4A5565", lineHeight: lh(lang, 1.7), margin: "0 0 32px" }}>{WEB.body[lang]}</p>

          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {WEB.points.map((p) => (
              <li key={p.label.en} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 20, height: 20, background: "#EFF6FF", border: "1.5px solid #BBDFFC" }}
                >
                  <Check size={10} strokeWidth={3} color="#046EC5" aria-hidden />
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#101828", lineHeight: lh(lang, 1.5, 1.7) }}>{p.label[lang]}</div>
                  <div style={{ fontSize: 13, color: "#99A1AF", lineHeight: lh(lang, 1.5, 1.7) }}>{p.detail[lang]}</div>
                </div>
              </li>
            ))}
          </ul>

          <GradientLink href="/chat" className="mt-8">
            <WebIcon size={18} /> {COMMON.openWeb[lang]}
          </GradientLink>
        </div>

        <BrowserMock lang={lang} />
      </div>
    </section>
  );
}

function BrowserMock({ lang }: { lang: Lang }) {
  return (
    <div className="relative" aria-hidden>
      <div
        className="absolute inset-5 -z-10 rounded-[20px]"
        style={{ background: "linear-gradient(135deg,#BBDFFC,#64E8C722)", filter: "blur(24px)", opacity: 0.5 }}
      />
      <div className="overflow-hidden rounded-2xl" style={{ background: "#F8FAFC", boxShadow: "0 24px 80px rgba(0,0,0,0.12)", border: "1px solid #E8EDF2" }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: "#F1F5F9", borderBottom: "1px solid #E8EDF2" }}>
          <div className="flex gap-1.5">
            {["#FECACA", "#FEF08A", "#BBF7D0"].map((c) => (
              <span key={c} className="rounded-full" style={{ width: 10, height: 10, background: c }} />
            ))}
          </div>
          <div
            className="flex flex-1 items-center gap-1.5 rounded-md bg-white px-3 py-[5px]"
            style={{ fontSize: 11, color: "#99A1AF", border: "1px solid #E8EDF2" }}
          >
            superask.kh
          </div>
        </div>

        <div className="flex items-center justify-between bg-white px-5 py-3" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <SuperAskLogo size="sm" asLink={false} />
          <div className="hidden gap-4 sm:flex">
            {WEB.browserNav.map((n) => (
              <span key={n.en} style={{ fontSize: 12, color: "#4A5565" }}>
                {n[lang]}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white px-5 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5" style={{ background: "#F8FAFC", border: "1.5px solid #BBDFFC" }}>
            <Search size={14} color="#99A1AF" aria-hidden />
            <span className="flex-1 truncate font-km" style={{ fontSize: 13, color: "#99A1AF" }}>
              {WEB.searchValue}
            </span>
            <span className="rounded-md" style={{ background: "#046EC5", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 12px" }}>
              {WEB.ask[lang]}
            </span>
          </div>
        </div>

        <div className="bg-white px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center gap-1.5" style={{ fontSize: 11, color: "#99A1AF", lineHeight: lh(lang, 1.5, 1.7) }}>
            <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: "#64E8C7" }} />
            {WEB.showing[lang]}
          </div>
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #E8EDF2" }}>
            <div className="px-4 py-3.5" style={{ background: "#F8FAFC", borderBottom: "1px solid #E8EDF2" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#101828", lineHeight: lh(lang, 1.4, 1.7) }}>{WEB.resultTitle[lang]}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3">
              {WEB.resultRows.map((r) => (
                <div key={r.l.en}>
                  <div
                    style={{ fontSize: 10, fontWeight: 700, color: "#046EC5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}
                  >
                    {r.l[lang]}
                  </div>
                  <div style={{ fontSize: 12, color: "#4A5565", lineHeight: lh(lang, 1.45, 1.7) }}>{r.v[lang]}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#EFF6FF", borderTop: "1px solid #E8EDF2" }}>
              <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: "#64E8C7" }} />
              <span style={{ fontSize: 11, color: "#046EC5", lineHeight: lh(lang, 1.45, 1.7) }}>{WEB.resultSource[lang]}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {WEB.related.map((r) => (
              <span key={r.en} style={{ fontSize: 11, color: "#046EC5", background: "#EFF6FF", padding: "4px 10px", borderRadius: 20, lineHeight: 1.5 }}>
                {r[lang]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Anatomy of an answer ────────────────────────────────────────────────── */

export function Anatomy({ lang }: { lang: Lang }) {
  return (
    <section className="overflow-hidden px-6 py-24" style={{ background: "#FAFBFC" }}>
      <div className="mx-auto max-w-[1100px] text-center">
        <Eyebrow>{ANATOMY.eyebrow[lang]}</Eyebrow>
        <Headline copy={ANATOMY.title} lang={lang} style={{ maxWidth: 560, margin: "0 auto 16px" }} />
        <p style={{ fontSize: 15, color: "#4A5565", margin: "0 auto 72px", maxWidth: 520, lineHeight: lh(lang, 1.6) }}>{ANATOMY.body[lang]}</p>

        <div className="flex justify-center">
          <div className="relative w-full max-w-[560px]">
            <div
              className="overflow-hidden rounded-[20px] bg-white text-left"
              style={{ boxShadow: "0 8px 48px rgba(4,110,197,0.10)", border: "1px solid #E8EDF2" }}
            >
              <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: GRADIENT }}>
                <div className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: "rgba(255,255,255,0.2)" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>SA</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.4 }}>SuperAsk</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", lineHeight: lh(lang, 1.4, 1.7) }}>{ANATOMY.assistant[lang]}</div>
                </div>
                <div
                  className="ml-auto hidden sm:block"
                  style={{ background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff", fontWeight: 600 }}
                >
                  {ANATOMY.topic[lang]}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <circle cx="6" cy="6" r="5" stroke="#046EC5" strokeWidth="1.2" />
                  <circle cx="6" cy="6" r="2" fill="#046EC5" />
                </svg>
                <span style={{ fontSize: 12, color: "#4A5565" }}>{ANATOMY.intentLabel[lang]}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#101828", lineHeight: lh(lang, 1.5, 1.7) }}>{ANATOMY.intent[lang]}</span>
              </div>

              <div className="px-5 py-4">
                {ANATOMY.fields.map((f, i) => (
                  <div
                    key={f.label.en}
                    style={{
                      paddingBottom: i < 3 ? 12 : 0,
                      marginBottom: i < 3 ? 12 : 0,
                      borderBottom: i < 3 ? "1px solid #F1F5F9" : "none",
                    }}
                  >
                    <div
                      style={{ fontSize: 11, fontWeight: 700, color: "#046EC5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}
                    >
                      {f.label[lang]}
                    </div>
                    <div style={{ fontSize: 13, color: "#101828", lineHeight: lh(lang, 1.5, 1.8) }}>{f.val[lang]}</div>
                  </div>
                ))}
              </div>

              <div
                className="mx-5 mb-5 flex items-start gap-2.5 rounded-[10px] px-3.5 py-3"
                style={{ background: "#EFF6FF", border: "1px solid #BBDFFC" }}
              >
                <span className="mt-1 shrink-0 rounded-full" style={{ width: 7, height: 7, background: "#64E8C7" }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#046EC5", marginBottom: 2 }}>{ANATOMY.sourceLabel[lang]}</div>
                  <div style={{ fontSize: 12, color: "#4A5565", lineHeight: lh(lang, 1.5, 1.8) }}>
                    {ANATOMY.sourceText[lang]}
                    <span style={{ color: "#0A7D63", fontWeight: 600 }}>{ANATOMY.verifiedOn[lang]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Annotations — wide screens only, where there is room beside the card. */}
            {ANATOMY.notes.map((n) => (
              <div
                key={n.label.en}
                className="absolute hidden w-[220px] items-start gap-2.5 text-left xl:flex"
                style={{ top: n.top, left: "105%" }}
              >
                <div className="flex flex-col items-center pt-1">
                  <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: "#046EC5" }} />
                  <span style={{ width: 1, minHeight: 32, background: "#BBDFFC", marginTop: 2 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#101828", marginBottom: 3, lineHeight: lh(lang, 1.4, 1.7) }}>{n.label[lang]}</div>
                  <div style={{ fontSize: 12, color: "#4A5565", lineHeight: lh(lang, 1.5, 1.8) }}>{n.detail[lang]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
