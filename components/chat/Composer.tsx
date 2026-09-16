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
    <div className="shrink-0 px-4 pb-5 pt-2" style={{ background: T.page }}>
      <div className="mx-auto" style={{ maxWidth: 760 }}>
        {/*
          The focus ring is drawn on the container rather than the textarea,
          because the visible control here is the rounded box — a ring around
          the bare textarea inside it looks like a rendering fault. The inner
          field therefore suppresses its own ring, and this element takes
          responsibility for FR-71 on its behalf.
        */}
        <div
          className="flex items-end gap-2 rounded-2xl py-2 pl-4 pr-2 transition-all"
          style={{
            background: T.paper,
            border: `1px solid ${focused ? T.sky : T.line}`,
            boxShadow: focused ? T.ringSky : T.shadowMd,
          }}
        >
          <label htmlFor="ag-question" className="sr-only">
            {UI.placeholder[lang]}
          </label>
          <textarea
            id="ag-question"
            ref={ref}
            rows={1}
            className="km ag-noring flex-1 resize-none bg-transparent py-1.5 outline-none"
            placeholder={`${UI.placeholder.km} · ${UI.placeholder.en}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line — the mainstream
              // assistant convention FR-60 points at.
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
            className="ag-press mb-0.5 flex shrink-0 items-center justify-center rounded-xl transition-all"
            style={{
              width: 34,
              height: 34,
              background: canSend ? T.deep : T.lineSoft,
              color: canSend ? "#fff" : T.inkFaint,
              cursor: canSend ? "pointer" : "not-allowed",
              boxShadow: canSend ? T.shadowSm : "none",
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
          className="km"
          style={{
            fontSize: 10.5,
            color: T.inkFaint,
            textAlign: "center",
            marginTop: 9,
            lineHeight: 1.7,
          }}
        >
          {UI.composerNote[lang]}
        </div>
      </div>
    </div>
  );
}
