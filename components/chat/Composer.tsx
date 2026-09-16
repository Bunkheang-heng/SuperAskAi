"use client";

/**
 * The question box.
 *
 * FR-60: conversational, and consistent with mainstream assistant applications
 * so that a citizen needs no instruction to use it. That constraint rules out
 * novel interaction patterns however clever — the familiar shape IS the
 * accessibility feature for the low-digital-literacy segments in section 5.1.
 *
 * The voice button that used to sit here has been removed. It was permanently
 * disabled with a tooltip explaining it arrives in Phase 2 with Sarika (FR-69),
 * which is roadmap information addressed to us, not to a citizen: a greyed-out
 * control on the primary input reads as something broken, and is the first thing
 * a first-time user tries to press. FR-69 is satisfied when voice ships, not by
 * showing a dead affordance in advance.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import type { Lang } from "@/lib/types";
import { T } from "@/lib/ui/theme";
import { UI } from "@/lib/ui/copy";

export function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  lang,
  focusKey,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  lang: Lang;
  /**
   * Changes whenever the citizen should be returned to the input — starting a
   * new question, or opening one from history. Without this, "New question"
   * clears the screen but leaves focus on the sidebar button, so the next
   * keystroke goes nowhere and the citizen has to find and tap the box again.
   */
  focusKey?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focusKey) return;
    // Skip on touch devices: focusing the field pops the on-screen keyboard and
    // covers the answer the citizen just asked for.
    const touch =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    if (!touch) ref.current?.focus();
  }, [focusKey]);

  // Grow with content up to a cap, so a long Khmer question is readable while
  // typing rather than scrolling inside two lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !busy;

  return (
    <div
      className="shrink-0 px-4 pb-5 pt-3 sm:px-6"
      style={{
        background: T.paper,
        borderTop: `1px solid ${T.line}`,
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <div
          className="flex items-end gap-2 rounded-xl py-2 pl-4 pr-2 transition-all"
          style={{
            background: T.page,
            border: `1px solid ${focused ? T.sky : T.line}`,
            boxShadow: focused ? T.ringSky : "none",
          }}
        >
          <label htmlFor="ag-question" className="sr-only">
            {UI.placeholder[lang]}
          </label>
          <textarea
            id="ag-question"
            ref={ref}
            rows={1}
            className={`ag-noring flex-1 resize-none bg-transparent py-1.5 outline-none ${lang === "km" ? "km" : ""}`}
            placeholder={UI.placeholder[lang]}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            style={{ fontSize: 14.5, maxHeight: 160, color: T.ink }}
          />

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            className="ag-press mb-0.5 flex shrink-0 items-center justify-center rounded-lg transition-all"
            style={{
              width: 36,
              height: 36,
              background: canSend ? T.deep : T.lineSoft,
              color: canSend ? "#fff" : T.inkFaint,
              cursor: canSend ? "pointer" : "not-allowed",
            }}
            onMouseEnter={(e) => {
              if (canSend) e.currentTarget.style.background = T.deepHover;
            }}
            onMouseLeave={(e) => {
              if (canSend) e.currentTarget.style.background = T.deep;
            }}
            aria-label={UI.send[lang]}
          >
            <ArrowUp size={17} aria-hidden />
          </button>
        </div>

        <div
          style={{
            fontSize: 11,
            color: T.inkFaint,
            textAlign: "center",
            marginTop: 10,
            lineHeight: 1.6,
          }}
        >
          {UI.composerNote[lang]}
        </div>
      </div>
    </div>
  );
}
