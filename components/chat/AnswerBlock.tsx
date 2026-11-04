"use client";

/**
 * One assistant turn: the answer, its persistent source receipt, the escalation
 * action, the controls, and the non-binding notice.
 *
 * Ordering here is a requirement, not a layout preference. The answer, then the
 * sources (FR-62), then escalation (FR-66), then the notice (FR-65). The notice
 * is last because it applies to everything above it.
 *
 * Visual: the Figma's answer card — gradient header naming the owning ministry
 * when the answer is sourced, labelled sections below, feedback row at the foot.
 */

import { useState } from "react";
import { AlertTriangle, Flag, Send, Terminal } from "lucide-react";
import type { AskResponse } from "@/lib/types";
import { T } from "@/lib/ui/theme";
import { UI, UNVERIFIED_NOTICE } from "@/lib/ui/copy";
import { SUPPORT_HANDLE } from "@/lib/ui/support";
import { AnswerText } from "./AnswerText";
import { SourceCard } from "./SourceCard";
import { ReportDialog } from "./ReportDialog";

/** The assistant's avatar: gradient disc with the SA monogram. */
export function BotAvatar({ size = 30 }: { size?: number }) {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: T.gradient, marginTop: 2 }}
    >
      <span style={{ fontSize: size * 0.3, fontWeight: 800, color: "#fff", lineHeight: 1 }}>SA</span>
    </div>
  );
}

const MINOR_WORDS = new Set(["of", "and", "the", "for", "&"]);

/** "Ministry of Public Works and Transport" → "MPWT"; "Ministry of Interior" → "MoI". */
function ministryAbbr(ministry: string): string {
  const one = /^Ministry of (\w+)$/i.exec(ministry.trim());
  if (one) return `Mo${one[1][0].toUpperCase()}`;
  const initials = ministry
    .split(/\s+/)
    .filter((w) => w && !MINOR_WORDS.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join("");
  return initials.slice(0, 4) || "GOV";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2"
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.inkFaint,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

export function AnswerBlock({
  answer,
  onOpenTrace,
  onEscalate,
  showDetail = false,
}: {
  answer: AskResponse;
  onOpenTrace: (a: AskResponse) => void;
  /** Handover to DG Support. Owns the transcript, so it lives in Chat. */
  onEscalate: (a: AskResponse) => Promise<void>;
  /** True for the first escalated answer in a conversation only. */
  showDetail?: boolean;
}) {
  const [reporting, setReporting] = useState(false);
  const [handover, setHandover] = useState<"idle" | "sending">("idle");
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const lang = answer.lang;
  const hasSources = answer.citations.length > 0;
  const lead = answer.citations[0];

  /*
    The engine appends UNVERIFIED_NOTICE to the answer string so that consumers
    which render only the text still carry the warning. This interface renders
    it as a banner above the answer instead — earlier in the reading order,
    where a qualification is actually read — so the trailing copy of it comes
    off first. Both strings come from lib/ui/copy.ts, so the match is exact.
  */
  const body =
    answer.unverified && answer.answer.endsWith(UNVERIFIED_NOTICE[lang])
      ? answer.answer.slice(0, -UNVERIFIED_NOTICE[lang].length).trimEnd()
      : answer.answer;

  const footBtn = "inline-flex items-center gap-1.5 transition-colors hover:text-[#046EC5]";

  return (
    <div className="ag-fade mb-5 flex items-start gap-2.5">
      <BotAvatar />

      <div className="min-w-0" style={{ maxWidth: "min(560px, 100%)", flex: "1 1 auto" }}>
        <div
          className="overflow-hidden bg-white"
          style={{ borderRadius: "4px 16px 16px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
        >
          {/* Sourced answers lead with the owning ministry, as in the Figma. */}
          {hasSources && lead && (
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: T.gradient }}>
              <div
                aria-hidden
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: 38,
                  height: 38,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.32)",
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
                  {ministryAbbr(lead.ministry)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="km truncate"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                    textTransform: lang === "km" ? undefined : "uppercase",
                    letterSpacing: lang === "km" ? undefined : "0.07em",
                    lineHeight: 1.6,
                  }}
                >
                  {lang === "km" ? lead.ministryKm : lead.ministry}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.35 }}>{lead.doc}</div>
              </div>
              <div
                className="shrink-0"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  lineHeight: 1.8,
                }}
              >
                {UI.official[lang]}
              </div>
            </div>
          )}

          {/*
            FR-62 inverted: where there is no source to attribute, say so before
            the answer rather than attributing nothing and letting it read as
            official.
          */}
          {answer.unverified && (
            <div className="px-4 pt-4">
              <div
                className="flex items-start gap-2 rounded-[10px] px-3 py-2.5"
                style={{ background: T.noticeWash, border: `1px solid ${T.noticeLine}` }}
              >
                <AlertTriangle size={14} color={T.noticeText} className="mt-1 shrink-0" aria-hidden />
                <div>
                  <div className="km" style={{ fontSize: 12.5, fontWeight: 600, color: T.noticeText }}>
                    {UI.unverifiedLabel[lang]}
                  </div>
                  <div className="km mt-0.5" style={{ fontSize: 12, lineHeight: 1.55, color: T.inkSoft }}>
                    {UI.unverifiedBody[lang]}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3.5" style={{ color: T.ink }}>
            <AnswerText text={body} />
          </div>

          {/* FR-62: persistent, not behind a control. */}
          {hasSources && (
            <div className="px-4 py-3" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
              <SectionLabel>
                {answer.citations.length === 1
                  ? UI.sourceOne[lang]
                  : `${UI.sourceMany[lang]} · ${answer.citations.length}`}
              </SectionLabel>
              <div className="flex flex-col gap-2">
                {answer.citations.map((c) => (
                  <SourceCard key={c.id} citation={c} lang={lang} />
                ))}
              </div>
            </div>
          )}

          {/*
            FR-66 — escalation as an explicit action. One compact row: the
            reason, then the action. The longer explanation appears only on the
            first escalation of a conversation (showDetail).

            On the FR-28 wording: this deliberately does NOT tell the citizen
            their conversation has been passed along — whether the officer sees
            it depends on dependency D-04, which is not verified.
          */}
          {answer.escalate && (
            <div className="px-4 py-3" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                <span className="km inline-flex items-center gap-1.5" style={{ fontSize: 12.5, color: T.inkSoft }}>
                  <AlertTriangle size={13} color={T.noticeText} className="shrink-0" aria-hidden />
                  {UI.escalateCompact[lang]}
                </span>

                <button
                  disabled={handover === "sending"}
                  title={`${SUPPORT_HANDLE} · Telegram`}
                  className="ag-press inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                  style={{
                    background: handover === "sending" ? T.inkFaint : T.deep,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onClick={async () => {
                    setHandover("sending");
                    try {
                      await onEscalate(answer);
                    } finally {
                      setHandover("idle");
                    }
                  }}
                >
                  <Send size={12} aria-hidden /> {UI.connectOfficer[lang]}
                </button>
              </div>

              {showDetail && (
                <div className="km mt-2" style={{ fontSize: 11, color: T.inkFaint, maxWidth: 460 }}>
                  {UI.escalateDetail[lang]}
                </div>
              )}
            </div>
          )}

          {/* Feedback + controls. "No" opens the FR-67 report, so it goes somewhere. */}
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
            style={{ borderTop: `1px solid ${T.lineSoft}`, fontSize: 12 }}
          >
            {helpful === true ? (
              <span style={{ color: T.tealText, fontWeight: 600 }} role="status">
                {UI.thanks[lang]}
              </span>
            ) : (
              <>
                <span style={{ color: T.inkFaint }}>{UI.helpful[lang]}</span>
                <button
                  type="button"
                  onClick={() => setHelpful(true)}
                  className="rounded-md px-2.5 py-1 transition-colors hover:border-[#BBDFFC]"
                  style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}
                >
                  {UI.yes[lang]}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHelpful(false);
                    setReporting(true);
                  }}
                  className="rounded-md px-2.5 py-1 transition-colors"
                  style={{
                    border: `1px solid ${helpful === false ? T.redLine : T.line}`,
                    background: helpful === false ? T.redWash : "transparent",
                    color: helpful === false ? T.red : T.inkSoft,
                  }}
                >
                  {UI.no[lang]}
                </button>
              </>
            )}

            <div className="ml-auto flex items-center gap-3.5">
              {answer.diagnostics && (
                <button onClick={() => onOpenTrace(answer)} className={footBtn} style={{ color: T.inkFaint, fontSize: 11 }}>
                  <Terminal size={11} aria-hidden /> {UI.trace[lang]}
                </button>
              )}
              {/* FR-67 */}
              <button onClick={() => setReporting(true)} className={footBtn} style={{ color: T.inkFaint, fontSize: 11 }}>
                <Flag size={11} aria-hidden /> {UI.reportError[lang]}
              </button>
            </div>
          </div>
        </div>

        {/* FR-65: with every answer. */}
        <div className="km mt-2 px-1" style={{ fontSize: 10.5, color: T.inkFaint, lineHeight: 1.7 }}>
          {UI.notBinding[lang]}
        </div>
      </div>

      {reporting && (
        <ReportDialog
          answerId={answer.id}
          citedIds={answer.citations.map((c) => c.id)}
          ministries={[...new Set(answer.citations.map((c) => c.ministry))]}
          lang={lang}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}
