"use client";

/**
 * Sidebar: recent conversations and popular procedures (FR-68), on the
 * Figma's dark slate panel.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ──────────────────────────────────────────
 * The provider card — model name, hosting, residency — used to sit at the
 * bottom of this panel. It has been removed from the citizen interface. It was
 * operator instrumentation: a citizen cannot act on a model name, and a bare
 * "Outside Cambodia" reads as a warning about their own data. Operators still
 * get it from GET /api/health (NFR-11).
 */

import { X } from "lucide-react";
import type { Lang } from "@/lib/types";
import { UI } from "@/lib/ui/copy";
import { TOPICS } from "@/lib/ui/landing";
import type { Conversation } from "@/lib/ui/history";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "rgba(255,255,255,0.45)",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        lineHeight: 1.6,
      }}
    >
      {children}
    </span>
  );
}

export function Sidebar({
  lang,
  onSuggestion,
  history,
  activeId,
  onOpenConversation,
  onDeleteConversation,
  onClearHistory,
  className = "",
}: {
  lang: Lang;
  onSuggestion: (q: string) => void;
  history: Conversation[];
  activeId: string;
  onOpenConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearHistory: () => void;
  className?: string;
}) {
  return (
    <aside
      className={`ag-scroll flex shrink-0 flex-col overflow-y-auto ${className}`}
      style={{ width: 232, background: "#1E2939" }}
    >
      {/* Recent conversations. Device-local — see lib/ui/history.ts. */}
      {history.length > 0 && (
        <div className="px-4 pb-3.5 pt-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="mb-2.5 flex items-baseline justify-between gap-2 px-0.5">
            <Label>{UI.history[lang]}</Label>
            <button
              onClick={() => {
                if (window.confirm(UI.clearHistoryConfirm[lang])) onClearHistory();
              }}
              className="transition-colors hover:text-white"
              style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}
            >
              {UI.clearHistory[lang]}
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            {history.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className="group relative flex items-center rounded-lg transition-colors hover:bg-white/[0.08]"
                  style={{ background: active ? "rgba(255,255,255,0.10)" : undefined }}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 rounded-sm"
                      style={{ top: 7, bottom: 7, width: 2.5, background: "#64E8C7" }}
                    />
                  )}
                  <button
                    onClick={() => onOpenConversation(c.id)}
                    className="km flex-1 truncate px-2.5 py-2 text-left"
                    style={{
                      fontSize: 13,
                      color: active ? "#fff" : "rgba(255,255,255,0.7)",
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
                    style={{ color: "rgba(255,255,255,0.5)" }}
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

      {/* FR-68: suggested procedures, always one tap away. */}
      <div className="px-4 pb-5 pt-4">
        <div className="mb-2.5 px-0.5">
          <Label>{UI.popular[lang]}</Label>
        </div>
        <div className="flex flex-col gap-0.5">
          {TOPICS.map((t) => (
            <button
              key={t.en}
              onClick={() => onSuggestion(t.ask[lang])}
              className="rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.08]"
            >
              <div className="font-km" style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.88)", lineHeight: 1.7 }}>
                {t.km}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{t.en}</div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
