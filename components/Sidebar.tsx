"use client";

/**
 * Sidebar: brand, reset, suggested questions (FR-68), and recent conversations.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ──────────────────────────────────────────
 * The provider card — model name, hosting, residency — used to sit at the
 * bottom of this panel. It has been removed from the citizen interface. It was
 * operator instrumentation: a citizen cannot act on "claude-haiku-4-5", and a
 * bare "Outside Cambodia" with no context reads as a warning about their own
 * data rather than as the deployment note it was. Operators have not lost it —
 * GET /api/health still reports provider, hosting and residency, which is the
 * correct surface for a compliance property of a running instance (NFR-11).
 */

import { Plus, X } from "lucide-react";
import type { Lang } from "@/lib/types";
import { T } from "@/lib/theme";
import { SUGGESTIONS, UI } from "@/lib/ui-copy";
import type { Conversation } from "@/lib/history";

/** Section label. Repeated three times here; the sizing is the shared part. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="ag-mono"
      style={{
        fontSize: 9.5,
        letterSpacing: "0.09em",
        color: T.inkFaint,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export function Sidebar({
  lang,
  onReset,
  onSuggestion,
  showSuggestions,
  history,
  activeId,
  onOpenConversation,
  onDeleteConversation,
  onClearHistory,
}: {
  lang: Lang;
  onReset: () => void;
  onSuggestion: (q: string) => void;
  showSuggestions: boolean;
  history: Conversation[];
  activeId: string;
  onOpenConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearHistory: () => void;
}) {
  return (
    <aside
      className="hidden shrink-0 flex-col md:flex"
      style={{
        width: 272,
        background: T.paper,
        borderRight: `1px solid ${T.line}`,
      }}
    >
      {/* Brand lockup */}
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-baseline gap-1">
          <span
            style={{
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "-0.025em",
              color: T.deep,
            }}
          >
            AskGov
          </span>
          <span className="ag-mono" style={{ fontSize: 10, color: T.sky }}>
            .kh
          </span>
        </div>
        <div
          className="km"
          style={{
            fontSize: 11,
            color: T.inkFaint,
            marginTop: 1,
            lineHeight: 1.6,
          }}
        >
          {UI.brandSub[lang]}
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={onReset}
          className="ag-press flex w-full items-center gap-2 rounded-xl px-3 py-2.5 transition-all"
          style={{
            border: `1px solid ${T.line}`,
            fontSize: 13,
            fontWeight: 500,
            color: T.ink,
            background: T.paper,
            boxShadow: T.shadowSm,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.skyLine;
            e.currentTarget.style.background = T.skyWash;
            e.currentTarget.style.color = T.deep;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.line;
            e.currentTarget.style.background = T.paper;
            e.currentTarget.style.color = T.ink;
          }}
        >
          <Plus size={15} aria-hidden /> {UI.newQuestion[lang]}
        </button>
      </div>

      {/* FR-68: suggested questions where no conversation is in progress. */}
      {showSuggestions && (
        <div className="mt-7 px-4">
          <div className="px-1">
            <Label>{UI.tryAsking[lang]}</Label>
          </div>
          <div className="mt-2 flex flex-col gap-0.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.en}
                onClick={() => onSuggestion(lang === "km" ? s.km : s.en)}
                className="km rounded-lg px-3 py-2 text-left transition-colors"
                style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.75 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.skyWash;
                  e.currentTarget.style.color = T.deep;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = T.inkSoft;
                }}
              >
                {lang === "km" ? s.km : s.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent conversations. Device-local — see lib/history.ts. */}
      {history.length > 0 && (
        <div className="mt-7 flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <Label>{UI.history[lang]}</Label>
            <button
              onClick={() => {
                if (window.confirm(UI.clearHistoryConfirm[lang])) onClearHistory();
              }}
              className="ag-mono transition-colors"
              style={{ fontSize: 10, color: T.inkFaint }}
              onMouseEnter={(e) => (e.currentTarget.style.color = T.deep)}
              onMouseLeave={(e) => (e.currentTarget.style.color = T.inkFaint)}
            >
              {UI.clearHistory[lang]}
            </button>
          </div>

          <div className="ag-scroll -mx-1 flex-1 overflow-y-auto px-1">
            {history.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className="group relative flex items-center gap-1 rounded-lg transition-colors"
                  style={{
                    background: active ? T.skyWash : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = T.lineSoft;
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Active marker: a rule, not a border, so the row does not
                      shift by a pixel when it becomes active. */}
                  {active && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 2.5,
                        borderRadius: 2,
                        background: T.sky,
                      }}
                    />
                  )}
                  <button
                    onClick={() => onOpenConversation(c.id)}
                    className="km flex-1 truncate px-2.5 py-2 text-left"
                    style={{
                      fontSize: 12.5,
                      color: active ? T.deep : T.inkSoft,
                      fontWeight: active ? 600 : 400,
                      lineHeight: 1.5,
                    }}
                    title={c.title}
                  >
                    {c.title}
                  </button>
                  <button
                    onClick={() => onDeleteConversation(c.id)}
                    className="mr-1 shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    style={{ color: T.inkFaint }}
                    aria-label={`${UI.deleteOne[lang]}: ${c.title}`}
                    title={UI.deleteOne[lang]}
                  >
                    <X size={12} aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
