"use client";

/**
 * The citizen chat interface (section 8.9).
 *
 * Layout only. Conversation state lives in useConversation. All model access
 * goes through POST /api/ask — this component holds no credential and knows no
 * provider (FR-74, R-15).
 *
 * Visual language matches the marketing surface: white chrome, deep brand
 * accents, SuperAsk logo lockup.
 */

import { Check, Menu, ShieldCheck, X } from "lucide-react";
import { T, BRAND_BAR_HEIGHT } from "@/lib/ui/theme";
import { SUGGESTIONS, UI } from "@/lib/ui/copy";
import { SUPPORT_BOT, SUPPORT_HANDLE } from "@/lib/ui/support";
import { useSiteLang } from "@/lib/ui/site-lang";
import { SuperAskLogo } from "@/components/site";
import { AnswerBlock } from "./AnswerBlock";
import { Composer } from "./Composer";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { Sidebar } from "./Sidebar";
import { useConversation } from "./useConversation";

export interface Coverage {
  ministry: string;
  ministryKm: string;
  short: string;
}

export function Chat({ coverage }: { coverage: Coverage[] }) {
  const { lang, setLang } = useSiteLang("en");
  const {
    turns,
    input,
    setInput,
    busy,
    busyHere,
    trace,
    setTrace,
    sidebar,
    setSidebar,
    handoverError,
    history,
    conversationId,
    terminated,
    firstEscalationIndex,
    endRef,
    ask,
    startNewConversation,
    openConversation,
    deleteConversation,
    clearHistory,
    escalate,
  } = useConversation();

  return (
    <div
      className="flex w-full"
      style={{ height: "100dvh", background: T.page, color: T.ink }}
    >
      <a href="#ag-question" className="ag-skip">
        {UI.skipToComposer[lang]}
      </a>

      {sidebar && (
        <Sidebar
          lang={lang}
          onReset={startNewConversation}
          onSuggestion={ask}
          showSuggestions={turns.length === 0}
          history={history}
          activeId={conversationId}
          onOpenConversation={openConversation}
          onDeleteConversation={deleteConversation}
          onClearHistory={clearHistory}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {/* White chrome — same family as the landing SiteHeader */}
        <header
          className="flex shrink-0 items-center gap-3 px-4"
          style={{
            height: BRAND_BAR_HEIGHT,
            background: T.paper,
            borderBottom: `1px solid ${T.line}`,
            boxShadow: "0 1px 0 rgba(2,80,148,0.04)",
          }}
        >
          <button
            onClick={() => setSidebar((s) => !s)}
            className="hidden rounded-lg p-1.5 transition-colors md:block"
            style={{ color: T.inkSoft }}
            aria-label={UI.toggleSidebar[lang]}
            aria-expanded={sidebar}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.skyWash;
              e.currentTarget.style.color = T.deep;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = T.inkSoft;
            }}
          >
            {sidebar ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>

          <SuperAskLogo href="/" size="sm" />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "km" ? "en" : "km")}
              className="ag-press inline-flex h-8 items-center rounded-md border px-2.5 text-[12px] font-medium"
              style={{
                borderColor: T.line,
                color: T.ink,
                background: T.paper,
              }}
              aria-label={lang === "km" ? "Switch to English" : "ប្តូរទៅភាសាខ្មែរ"}
            >
              {lang === "km" ? "ខ្មែរ" : "EN"}
            </button>
          </div>
        </header>

        <div className="ag-scroll flex flex-1 flex-col overflow-y-auto">
          <div
            className="mx-auto flex w-full flex-1 flex-col px-4 py-8 sm:px-6"
            style={{
              maxWidth: 760,
              justifyContent: turns.length === 0 ? "center" : "flex-start",
            }}
          >
            {turns.length === 0 && (
              <div className="ag-fade" style={{ paddingBottom: 24 }}>

                <h1
                  className={lang === "km" ? "km" : undefined}
                  style={{
                    fontSize: "clamp(1.75rem, 4vw, 2.35rem)",
                    fontWeight: 700,
                    letterSpacing: lang === "km" ? undefined : "-0.03em",
                    color: T.deep,
                    lineHeight: lang === "km" ? 1.4 : 1.25,
                  }}
                >
                  {UI.heroTitle[lang]}
                </h1>

                <p
                  className={lang === "km" ? "km" : undefined}
                  style={{
                    fontSize: 15,
                    color: T.inkSoft,
                    marginTop: 14,
                    maxWidth: 520,
                    lineHeight: 1.7,
                  }}
                >
                  {UI.heroBody[lang]}
                </p>

                <div className="mt-8">
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: T.inkFaint,
                      marginBottom: 10,
                    }}
                  >
                    {UI.coversNow[lang]}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {coverage.map((c) => (
                      <span
                        key={c.ministry}
                        title={`${c.ministry} · ${c.ministryKm}`}
                        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5"
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: T.deep,
                          background: T.paper,
                          borderColor: T.line,
                        }}
                      >
                        <Check size={12} color={T.sky} aria-hidden />
                        {lang === "km" ? c.ministryKm : c.short}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-2 md:hidden">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.en}
                      onClick={() => ask(lang === "km" ? s.km : s.en)}
                      className={`ag-press rounded-xl border px-4 py-3 text-left ${lang === "km" ? "km" : ""}`}
                      style={{
                        fontSize: 13.5,
                        color: T.ink,
                        background: T.paper,
                        borderColor: T.line,
                      }}
                    >
                      {lang === "km" ? s.km : s.en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="ag-fade mb-7 flex justify-end">
                  <div
                    className="rounded-2xl rounded-br-md px-4 py-2.5"
                    style={{
                      background: T.deep,
                      color: "#fff",
                      fontSize: 14.5,
                      maxWidth: "82%",
                      lineHeight: 1.65,
                    }}
                  >
                    {turn.text}
                  </div>
                </div>
              ) : (
                <AnswerBlock
                  key={i}
                  answer={turn.response}
                  onOpenTrace={setTrace}
                  onEscalate={escalate}
                  showDetail={i === firstEscalationIndex}
                />
              ),
            )}

            {handoverError && (
              <div
                className="mb-8 rounded-xl px-4 py-3"
                style={{
                  background: T.noticeWash,
                  border: `1px solid ${T.noticeLine}`,
                  fontSize: 12.5,
                  color: T.noticeText,
                }}
                role="alert"
              >
                {UI.handoverFailed[lang]}{" "}
                <a
                  href={`https://t.me/${SUPPORT_BOT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: T.deep, fontWeight: 600 }}
                >
                  {SUPPORT_HANDLE}
                </a>
              </div>
            )}

            {busyHere && (
              <div className="mb-10 flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center rounded-md"
                  style={{
                    width: 22,
                    height: 22,
                    background: T.deep,
                  }}
                  aria-hidden
                >
                  <ShieldCheck size={12.5} color="#fff" />
                </div>
                <span
                  className="ag-pulse"
                  style={{ fontSize: 13, color: T.inkSoft }}
                  role="status"
                  aria-live="polite"
                >
                  {UI.working[lang]}
                </span>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {terminated ? (
          <div
            className="shrink-0 px-4 pb-6 pt-3"
            style={{ background: T.page }}
          >
            <div
              className="mx-auto rounded-xl px-4 py-3 text-center"
              style={{
                maxWidth: 760,
                background: T.redWash,
                border: "1px solid #EFC9C9",
                color: T.red,
                fontSize: 12.5,
              }}
            >
              {UI.emergencyTitle[lang]}
            </div>
          </div>
        ) : (
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => ask(input)}
            busy={busy}
            lang={lang}
            focusKey={conversationId}
          />
        )}
      </main>

      {trace?.diagnostics && (
        <DiagnosticPanel
          diagnostics={trace.diagnostics}
          lang={lang}
          onClose={() => setTrace(null)}
        />
      )}
    </div>
  );
}
