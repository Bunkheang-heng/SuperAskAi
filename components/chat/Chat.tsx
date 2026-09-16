"use client";

/**
 * The citizen chat interface (section 8.9).
 *
 * Layout only. Conversation state lives in useConversation. All model access
 * goes through POST /api/ask — this component holds no credential and knows no
 * provider (FR-74, R-15).
 */

import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { T, BRAND_BAR_HEIGHT } from "@/lib/ui/theme";
import { SUGGESTIONS, UI } from "@/lib/ui/copy";
import { SUPPORT_BOT, SUPPORT_HANDLE } from "@/lib/ui/support";
import { AskGovLogo } from "@/components/site";
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
    lang,
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
        <header
          className="flex shrink-0 items-center gap-3 px-4"
          style={{
            // Inverted: deep brand bar, white wordmark.
            height: BRAND_BAR_HEIGHT,
            background: T.deep,
            borderBottom: `1px solid ${T.deepHover}`,
          }}
        >
          <button
            onClick={() => setSidebar((s) => !s)}
            className="hidden rounded-lg p-1.5 transition-colors md:block"
            // On the deep bar the control reads as a light tint and resolves to
            // white on hover, rather than the ink greys it used on paper.
            style={{ color: T.skyLine }}
            aria-label={UI.toggleSidebar[lang]}
            aria-expanded={sidebar}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.14)";
              e.currentTarget.style.color = T.paper;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = T.skyLine;
            }}
          >
            {sidebar ? (
              <ChevronLeft size={17} aria-hidden />
            ) : (
              <ChevronRight size={17} aria-hidden />
            )}
          </button>

          <div className="md:hidden">
            <AskGovLogo href="/" size="sm" tone="onDark" />
          </div>
        </header>

        {/*
          The empty state is centred in the viewport; a conversation is not.

          Top-aligning both left the landing screen with the hero pinned to the
          top and a large dead band above the composer, which reads as content
          that failed to load. Once turns exist the block goes back to normal
          top-aligned flow, because a conversation has to grow downward from a
          fixed origin — centring that would make the whole transcript jump on
          every new answer.
        */}
        <div className="ag-scroll flex flex-1 flex-col overflow-y-auto">
          <div
            className="mx-auto flex w-full flex-1 flex-col px-4 py-8"
            style={{
              maxWidth: 760,
              justifyContent: turns.length === 0 ? "center" : "flex-start",
            }}
          >
            {turns.length === 0 && (
              <div className="ag-fade" style={{ paddingBottom: 24 }}>
                <h1
                  style={{
                    fontSize: 32,
                    fontWeight: 650,
                    letterSpacing: "-0.033em",
                    color: T.ink,
                  }}
                >
                  {UI.heroTitle.en}
                </h1>
                <p
                  className="km"
                  style={{
                    fontSize: 21,
                    fontWeight: 500,
                    color: T.deep,
                    marginTop: 1,
                  }}
                >
                  {UI.heroTitle.km}
                </p>
                {/* A short brand rule under the bilingual title. The Khmer line
                    sits on a 1.95 line-height for subscript clearance (FR-61),
                    which leaves a gap that reads as accidental without it. */}
                <div
                  aria-hidden
                  style={{
                    width: 40,
                    height: 3,
                    borderRadius: 2,
                    background: T.sky,
                    marginTop: 14,
                  }}
                />
                <p
                  className="km"
                  style={{
                    fontSize: 14,
                    color: T.inkSoft,
                    marginTop: 16,
                    maxWidth: 520,
                  }}
                >
                  {UI.heroBody[lang]}
                </p>

                {/*
                  Coverage, stated up front.

                  A citizen cannot tell from a chat box which ministries are on
                  the platform, so without this the only way to find the boundary
                  is to ask something outside it and be refused — which reads as
                  a broken service rather than an un-onboarded ministry. Naming
                  the domains here converts a dead end into a redirect.
                */}
                <div className="mt-7">
                  <div
                    className="ag-mono mb-2.5"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      color: T.inkFaint,
                    }}
                  >
                    {UI.coversNow[lang]}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {coverage.map((c) => (
                      <span
                        key={c.ministry}
                        title={`${c.ministry} · ${c.ministryKm}`}
                        className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3.5"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: T.deep,
                          background: T.paper,
                          border: `1px solid ${T.skyLine}`,
                          boxShadow: T.shadowSm,
                        }}
                      >
                        <Check size={12} color={T.sky} aria-hidden />
                        {c.short}
                      </span>
                    ))}
                  </div>
                </div>

                {/* FR-68 on mobile, where the sidebar is hidden. */}
                <div className="mt-7 flex flex-col gap-2 md:hidden">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.en}
                      onClick={() => ask(lang === "km" ? s.km : s.en)}
                      className="km ag-press rounded-xl px-4 py-3 text-left"
                      style={{
                        fontSize: 13,
                        color: T.deep,
                        background: T.paper,
                        border: `1px solid ${T.line}`,
                        boxShadow: T.shadowSm,
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
                    className="km rounded-2xl px-4 py-2.5"
                    style={{
                      background: T.deep,
                      color: "#fff",
                      fontSize: 14.5,
                      maxWidth: "82%",
                      borderBottomRightRadius: 6,
                      boxShadow: T.shadowSm,
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
                className="km mb-8 rounded-xl px-4 py-3"
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

            {/* Only where the question was asked — a thinking indicator in a
                conversation that asked nothing is a lie about what is loading. */}
            {busyHere && (
              <div className="mb-10 flex items-center gap-2">
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
                  className="ag-mono ag-pulse km"
                  style={{ fontSize: 11, color: T.inkFaint }}
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
              className="km mx-auto rounded-xl px-4 py-3 text-center"
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

      {/* FR-72 / FR-73 */}
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
