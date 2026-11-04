"use client";

/**
 * The citizen chat interface (section 8.9).
 *
 * Layout only. Conversation state lives in useConversation. All model access
 * goes through POST /api/ask — this component holds no credential and knows no
 * provider (FR-74, R-15).
 *
 * Visual language follows the SuperAsk Figma: white top bar with channel pill,
 * dark slate sidebar, cool-grey canvas, white answer cards.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Globe, Menu, Plus, Search, X } from "lucide-react";
import { T, BRAND_BAR_HEIGHT } from "@/lib/ui/theme";
import { UI } from "@/lib/ui/copy";
import { TOPICS } from "@/lib/ui/landing";
import { SUPPORT_BOT, SUPPORT_HANDLE } from "@/lib/ui/support";
import { MESSENGER_URL, TELEGRAM_URL } from "@/lib/ui/channels";
import { useSiteLang } from "@/lib/ui/site-lang";
import { SuperAskLogo } from "@/components/site";
import { LangToggle } from "@/components/site/SiteHeader";
import { AnswerBlock, BotAvatar } from "./AnswerBlock";
import { Composer } from "./Composer";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { Sidebar } from "./Sidebar";
import { useConversation } from "./useConversation";

export interface Coverage {
  ministry: string;
  ministryKm: string;
  short: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-[5px] px-4 py-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sa-bounce rounded-full"
          style={{ width: 7, height: 7, background: T.skyLine, animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export function Chat({ coverage }: { coverage: Coverage[] }) {
  const { lang, setLang } = useSiteLang("en");
  const [drawer, setDrawer] = useState(false);
  const {
    turns,
    input,
    setInput,
    busy,
    busyHere,
    trace,
    setTrace,
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

  // Deep link from the landing page topic chips: /chat?q=<question>.
  // Asked once, then stripped from the URL so a reload does not re-ask it.
  const askedFromUrl = useRef(false);
  useEffect(() => {
    if (askedFromUrl.current) return;
    askedFromUrl.current = true;
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q")?.trim();
    if (!q) return;
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    void ask(q);
    // `ask` is recreated each render; this must run exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sidebarProps = {
    lang,
    history,
    activeId: conversationId,
    onClearHistory: clearHistory,
    onDeleteConversation: deleteConversation,
  };

  return (
    <div className="flex w-full flex-col" style={{ height: "100dvh", background: T.canvas, color: T.ink }}>
      <a href="#ag-question" className="ag-skip">
        {UI.skipToComposer[lang]}
      </a>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        className="relative z-10 flex shrink-0 items-center gap-3 bg-white px-4 sm:gap-4 sm:px-5"
        style={{ height: BRAND_BAR_HEIGHT, borderBottom: "1px solid #D8E1EA", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => setDrawer((d) => !d)}
          className="rounded-md p-1 md:hidden"
          style={{ color: T.inkSoft }}
          aria-label={UI.toggleSidebar[lang]}
          aria-expanded={drawer}
        >
          {drawer ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>

        <SuperAskLogo href="/" size="sm" />

        <span
          className="hidden sm:inline-block"
          style={{ background: T.skyWash, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 600, color: T.sky, lineHeight: 1.6 }}
        >
          {UI.beta[lang]}
        </span>

        {/* Channel pill — you are on Web; the other two open the bots. */}
        <div
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full lg:flex"
          style={{ background: T.page, border: `1px solid ${T.line}`, padding: "5px 14px", fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}
        >
          <Globe size={12} color={T.sky} strokeWidth={2} aria-hidden />
          <span style={{ fontWeight: 600, color: T.sky }}>{UI.web[lang]}</span>
          <span aria-hidden style={{ color: T.lineStrong }}>·</span>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#046EC5]">
            Telegram
          </a>
          <span aria-hidden style={{ color: T.lineStrong }}>·</span>
          <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#046EC5]">
            Messenger
          </a>
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <LangToggle lang={lang} onLangChange={setLang} />
          <button
            type="button"
            onClick={() => {
              startNewConversation();
              setDrawer(false);
            }}
            className="ag-press inline-flex items-center gap-1.5 rounded-md transition-colors hover:border-[#046EC5]"
            style={{ border: `1px solid ${T.line}`, padding: "5px 12px", fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}
          >
            <Plus size={14} aria-hidden className="sm:hidden" />
            <span className="hidden sm:inline">{UI.newChat[lang]}</span>
            <span className="sr-only sm:hidden">{UI.newChat[lang]}</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Desktop: sidebar always present. */}
        <Sidebar {...sidebarProps} className="hidden md:flex" onSuggestion={ask} onOpenConversation={openConversation} />

        {/* Mobile: slide-over drawer. */}
        {drawer && (
          <div className="absolute inset-0 z-40 flex md:hidden" onClick={() => setDrawer(false)}>
            <div onClick={(e) => e.stopPropagation()} className="h-full">
              <Sidebar
                {...sidebarProps}
                className="h-full"
                onSuggestion={(q) => {
                  setDrawer(false);
                  void ask(q);
                }}
                onOpenConversation={(id) => {
                  setDrawer(false);
                  openConversation(id);
                }}
              />
            </div>
            <div className="flex-1" style={{ background: "rgba(0,0,0,0.3)" }} />
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="ag-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-5">
            <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
              {turns.length === 0 && !busyHere && (
                <div
                  className="ag-fade mx-auto rounded-[20px] bg-white px-6 py-10 text-center sm:px-8 sm:py-12"
                  style={{ maxWidth: 580, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginTop: "4vh" }}
                >
                  <div
                    className="mx-auto mb-5 flex items-center justify-center"
                    style={{ width: 56, height: 56, borderRadius: 14, background: T.skyWash }}
                  >
                    <Search size={26} strokeWidth={1.6} color={T.sky} aria-hidden />
                  </div>
                  <h1
                    style={{
                      fontSize: "clamp(24px,4vw,36px)",
                      fontWeight: 700,
                      color: T.ink,
                      letterSpacing: lang === "km" ? 0 : "-0.7px",
                      margin: "0 0 12px",
                      lineHeight: lang === "km" ? 1.5 : 1.15,
                    }}
                  >
                    {UI.emptyTitle[lang][0]}
                    <span className="grad-text">{UI.emptyTitle[lang][1]}</span>
                    {UI.emptyTitle[lang][2]}
                  </h1>
                  <p
                    className="km mx-auto"
                    style={{ fontSize: 15, color: T.inkSoft, margin: "0 auto 32px", maxWidth: 440, lineHeight: lang === "km" ? 1.9 : 1.6 }}
                  >
                    {UI.emptyBody[lang]}
                  </p>

                  <div className="mx-auto flex flex-wrap justify-center gap-2.5" style={{ maxWidth: 540 }}>
                    {TOPICS.slice(0, 4).map((t) => (
                      <button
                        key={t.en}
                        onClick={() => ask(t.ask[lang])}
                        className="sa-lift flex flex-col items-center gap-0.5 rounded-xl bg-white px-[18px] py-[11px]"
                        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.05)", border: "1.5px solid transparent" }}
                      >
                        <span className="font-km" style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.7 }}>
                          {t.km}
                        </span>
                        <span style={{ fontSize: 11, color: T.inkFaint, lineHeight: 1.4 }}>{t.en}</span>
                      </button>
                    ))}
                  </div>

                  {/* Coverage stated before the citizen asks, not discovered by refusal. */}
                  {coverage.length > 0 && (
                    <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: T.inkFaint,
                          marginBottom: 10,
                        }}
                      >
                        {UI.coversNow[lang]}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {coverage.map((c) => (
                          <span
                            key={c.ministry}
                            title={`${c.ministry} · ${c.ministryKm}`}
                            className="km inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                            style={{ fontSize: 12, fontWeight: 600, color: T.sky, background: T.skyWash }}
                          >
                            <Check size={12} color={T.tealText} aria-hidden />
                            {lang === "km" ? c.ministryKm : c.short}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {turns.map((turn, i) =>
                turn.role === "user" ? (
                  <div key={i} className="ag-fade mb-5 flex justify-end">
                    <div
                      className="km"
                      style={{
                        background: T.deep,
                        color: "#fff",
                        borderRadius: "12px 12px 4px 12px",
                        padding: "10px 14px",
                        fontSize: 14,
                        maxWidth: "80%",
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
                  className="mb-5 rounded-xl px-4 py-3"
                  style={{ background: T.noticeWash, border: `1px solid ${T.noticeLine}`, fontSize: 12.5, color: T.noticeText }}
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
                <div className="mb-5 flex items-start gap-2.5">
                  <BotAvatar />
                  <div className="bg-white" style={{ borderRadius: "4px 16px 16px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                    <TypingDots />
                  </div>
                  <span className="sr-only" role="status" aria-live="polite">
                    {UI.working[lang]}
                  </span>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {terminated ? (
            <div className="shrink-0 bg-white px-4 pb-6 pt-3" style={{ borderTop: "1px solid #D8E1EA" }}>
              <div
                className="mx-auto rounded-xl px-4 py-3 text-center"
                style={{ maxWidth: 760, background: T.redWash, border: `1px solid ${T.redLine}`, color: T.red, fontSize: 12.5 }}
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
          <DiagnosticPanel diagnostics={trace.diagnostics} lang={lang} onClose={() => setTrace(null)} />
        )}
      </div>
    </div>
  );
}
