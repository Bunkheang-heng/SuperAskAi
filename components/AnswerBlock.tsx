"use client";

/**
 * One assistant turn: the answer, its persistent source receipt, the escalation
 * action, the controls, and the non-binding notice.
 *
 * Ordering here is a requirement, not a layout preference. The answer, then the
 * sources (FR-62), then escalation (FR-66), then the notice (FR-65). The notice
 * is last because it applies to everything above it.
 */

import { useState } from "react";
import { AlertTriangle, Flag, Send, ShieldCheck, Terminal } from "lucide-react";
import type { AskResponse } from "@/lib/types";
import { T } from "@/lib/theme";
import { UI } from "@/lib/ui-copy";
import { SUPPORT_HANDLE } from "@/lib/support";
import { AnswerText } from "./AnswerText";
import { SourceCard } from "./SourceCard";
import { ReportDialog } from "./ReportDialog";

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
  const lang = answer.lang;
  const hasSources = answer.citations.length > 0;

  return (
    <div className="ag-fade mb-10">
      {/*
        Attribution header.

        The answer tier used to be printed here as "AskGov · Tier 2". Tier is
        PRD vocabulary (§10.2) describing which internal path produced the
        answer; it means nothing to a citizen and invites them to wonder whether
        a "Tier 3" answer is worse than a "Tier 1" one. It remains in the
        diagnostics payload for operators.
      */}
      <div className="mb-2.5 flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-md"
          style={{
            width: 21,
            height: 21,
            background: T.deep,
            boxShadow: T.shadowSm,
          }}
          aria-hidden
        >
          <ShieldCheck size={12.5} color="#fff" />
        </div>
        <span
          className="ag-mono"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.09em",
            color: T.inkFaint,
            textTransform: "uppercase",
          }}
        >
          AskGov
        </span>
      </div>

      <AnswerText text={answer.answer} />

      {/* FR-62: persistent, not behind a control. */}
      {hasSources && (
        <div className="mt-4">
          <div
            className="ag-mono mb-2"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.inkFaint,
            }}
          >
            {answer.citations.length === 1
              ? UI.sourceOne[lang]
              : `${UI.sourceMany[lang]} · ${answer.citations.length}`}
          </div>
          <div className="flex flex-col gap-2">
            {answer.citations.map((c) => (
              <SourceCard key={c.id} citation={c} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/*
        FR-66 — escalation as an explicit action.

        One compact row: the reason, then the action. The longer explanation
        appears only on the first escalation of a conversation (showDetail),
        because repeating it under every escalated answer trains the citizen to
        skip the whole block, and the action goes unread with it.

        On the FR-28 wording: this deliberately does NOT tell the citizen their
        conversation has been passed along. The transcript is stored server side
        against a reference token and the token travels in the link, but whether
        the officer sees it depends on the DG Support bot resolving that token —
        which is dependency D-04 and not verified. Promising a handover the far
        end may not honour is the kind of claim that costs trust the first time a
        citizen has to repeat themselves anyway.
      */}
      {answer.escalate && (
        <div className="mt-3.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span
              className="km inline-flex items-center gap-1.5"
              style={{ fontSize: 12.5, color: T.inkSoft }}
            >
              <AlertTriangle
                size={13}
                color={T.noticeText}
                className="shrink-0"
                aria-hidden
              />
              {UI.escalateCompact[lang]}
            </span>

            <button
              disabled={handover === "sending"}
              title={`${SUPPORT_HANDLE} · Telegram`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
              style={{
                background: handover === "sending" ? T.inkFaint : T.deep,
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
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
            <div
              className="km mt-2"
              style={{ fontSize: 11, color: T.inkFaint, maxWidth: 460 }}
            >
              {UI.escalateDetail[lang]}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {answer.diagnostics && (
          <button
            onClick={() => onOpenTrace(answer)}
            className="ag-mono flex items-center gap-1.5 transition-colors"
            style={{ fontSize: 10, color: T.inkFaint }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.deep)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.inkFaint)}
          >
            <Terminal size={10} aria-hidden /> {UI.trace[lang]}
          </button>
        )}

        {/* FR-67 */}
        <button
          onClick={() => setReporting(true)}
          className="ag-mono flex items-center gap-1.5 transition-colors"
          style={{ fontSize: 10, color: T.inkFaint }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.deep)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.inkFaint)}
        >
          <Flag size={10} aria-hidden /> {UI.reportError[lang]}
        </button>
        {/* The response time in milliseconds was removed from here. It is
            engineering telemetry, it changes on every answer, and it draws the
            eye away from the sources directly above it. Still in diagnostics. */}
      </div>

      {/* FR-65: with every answer. */}
      <div
        className="km"
        style={{
          fontSize: 10.5,
          color: T.inkFaint,
          marginTop: 10,
          paddingTop: 8,
          borderTop: `1px solid ${T.lineSoft}`,
        }}
      >
        {UI.notBinding[lang]}
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
