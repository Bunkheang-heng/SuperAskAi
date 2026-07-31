"use client";

/**
 * Report an incorrect answer (FR-67 for the control, FR-50 for the routing).
 *
 * The citizen report is the cheapest and fastest content-error detection channel
 * the platform has — cheaper than crawling, faster than review dates. R-03
 * depends on it working, so the control is one tap from the answer and the
 * comment is optional: requiring an explanation would suppress most reports.
 */

import { useEffect, useRef, useState } from "react";
import { Flag, X } from "lucide-react";
import type { Lang } from "@/lib/types";
import { T } from "@/lib/theme";
import { UI } from "@/lib/ui-copy";

export function ReportDialog({
  answerId,
  citedIds,
  ministries,
  lang,
  onClose,
}: {
  answerId: string;
  citedIds: string[];
  ministries: string[];
  lang: Lang;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // FR-71: keyboard navigation. Focus moves into the dialog on open and Escape
  // closes it, so a keyboard user is never trapped behind an overlay.
  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    setState("sending");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerId,
          kind: "incorrect",
          comment: comment.trim() || undefined,
          citedIds,
          ministries,
        }),
      });
    } catch {
      // A failed report must not block the citizen or lose their place. The
      // server-side log is the record of truth; a lost report is a missed
      // signal, not an error the citizen can act on.
    }
    setState("sent");
    setTimeout(onClose, 1600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11, 34, 55, 0.45)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={UI.reportTitle[lang]}
        className="ag-fade w-full rounded-2xl p-5"
        style={{ maxWidth: 440, background: T.paper }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flag size={15} color={T.deep} aria-hidden />
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              {UI.reportTitle[lang]}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ color: T.inkFaint }}
            aria-label={UI.cancel[lang]}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {state === "sent" ? (
          <p
            className="km"
            style={{ fontSize: 13, color: T.green, marginTop: 14 }}
          >
            {UI.reportThanks[lang]}
          </p>
        ) : (
          <>
            <p
              className="km"
              style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 10 }}
            >
              {UI.reportBody[lang]}
            </p>

            <textarea
              ref={textareaRef}
              className="km mt-3 w-full resize-none rounded-lg px-3 py-2"
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={UI.reportPlaceholder[lang]}
              style={{
                fontSize: 13.5,
                border: `1px solid ${T.line}`,
                background: T.page,
              }}
            />

            {citedIds.length > 0 && (
              <div
                className="ag-mono"
                style={{ fontSize: 10, color: T.inkFaint, marginTop: 6 }}
              >
                {UI.sourceMany[lang]}: {citedIds.join(", ")}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-2"
                style={{
                  fontSize: 13,
                  color: T.inkSoft,
                  border: `1px solid ${T.line}`,
                }}
              >
                {UI.cancel[lang]}
              </button>
              <button
                onClick={submit}
                disabled={state === "sending"}
                className="rounded-lg px-3.5 py-2"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#fff",
                  background: state === "sending" ? T.inkFaint : T.deep,
                }}
              >
                {UI.submit[lang]}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
