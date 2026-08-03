"use client";

/**
 * The citizen chat interface (section 8.9).
 *
 * All model access goes through POST /api/ask. This component holds no
 * credential and knows no provider — that is FR-74 and R-15, and it is also
 * what makes the Phase 1 migration invisible from here.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import type { AskResponse, Lang } from "@/lib/types";
import { T } from "@/lib/theme";
import { SUGGESTIONS, UI } from "@/lib/ui-copy";
import { detectLang } from "@/lib/lang/detect";
import { SUPPORT_BOT, SUPPORT_HANDLE } from "@/lib/support";
import {
  clearAll,
  loadAll,
  remove,
  save,
  type Conversation,
  type StoredTurn,
} from "@/lib/history";
import { AnswerBlock } from "./AnswerBlock";
import { Composer } from "./Composer";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { Sidebar } from "./Sidebar";

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; response: AskResponse };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface Coverage {
  ministry: string;
  ministryKm: string;
  short: string;
}

export function Chat({ coverage }: { coverage: Coverage[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  /**
   * The conversation a request is in flight for, or null.
   *
   * Not a boolean, because an answer has to know where it belongs. A citizen who
   * asks a question and switches to another conversation while it is being
   * answered used to have the answer appended to whatever was on screen when the
   * fetch resolved — and the persist effect then wrote that merged transcript
   * under the OTHER conversation's id, so the wrong answer was also saved into
   * the wrong history entry.
   */
  const [pendingIn, setPendingIn] = useState<string | null>(null);
  /** A request is in flight somewhere. Submission stays single-flight. */
  const busy = pendingIn !== null;
  const [trace, setTrace] = useState<AskResponse | null>(null);
  const [sidebar, setSidebar] = useState(true);
  const [handoverError, setHandoverError] = useState(false);
  const [sessionId] = useState(() => newId());
  const endRef = useRef<HTMLDivElement>(null);

  /**
   * Device-local conversation history (lib/history.ts). Loaded after mount, not
   * during render: localStorage does not exist on the server, and reading it in
   * the initial render would produce a hydration mismatch.
   */
  const [history, setHistory] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState(() => newId());

  /**
   * The live conversation id, readable from an async callback.
   *
   * `conversationId` closed over inside ask() is the value at the time the
   * request was made, which is the wrong thing to compare against — the whole
   * question is whether it has changed since. A ref is the value now.
   */
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  /** Only the conversation that asked shows the thinking indicator. */
  const busyHere = pendingIn === conversationId;

  useEffect(() => {
    setHistory(loadAll());
  }, []);

  // Persist after every completed exchange. Keyed on conversationId so
  // reopening an old conversation and continuing it updates that entry rather
  // than forking a near-duplicate.
  useEffect(() => {
    if (turns.length === 0) return;
    setHistory(save(conversationId, turns));
  }, [turns, conversationId]);

  // Interface language follows the last thing the citizen typed, so a Khmer
  // question produces Khmer chrome without a language switcher (FR-08).
  const lastUser = [...turns].reverse().find((t) => t.role === "user");
  const lang: Lang =
    lastUser && lastUser.role === "user" ? detectLang(lastUser.text) : "en";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busyHere]);

  // An emergency guardrail terminates the interaction (section 12, rule 6).
  const terminated = turns.some(
    (t) => t.role === "assistant" && t.response.terminal,
  );

  // Index of the first escalated answer. Only that one carries the explanation
  // of what the handover does; every later escalation shows the action alone.
  const firstEscalationIndex = turns.findIndex(
    (t) => t.role === "assistant" && t.response.escalate,
  );

  /**
   * Put a finished answer in the conversation that asked for it.
   *
   * On screen when it arrives: ordinary append. Somewhere else: write it
   * straight into that conversation's stored transcript, so the citizen finds
   * it waiting when they go back rather than losing the answer entirely. If the
   * conversation was deleted mid-flight the answer is dropped — recreating a
   * conversation the citizen just deleted would be worse than losing it, and on
   * a shared handset (see lib/history.ts) it would be a disclosure.
   */
  function deliver(askedIn: string, turn: Turn) {
    if (conversationIdRef.current === askedIn) {
      setTurns((prev) => [...prev, turn]);
      return;
    }

    const stored = loadAll().find((c) => c.id === askedIn);
    if (!stored) return;
    setHistory(save(askedIn, [...stored.turns, turn as StoredTurn]));
  }

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy || terminated) return;

    // Which conversation this answer belongs to, fixed at the moment of asking.
    const askedIn = conversationId;

    setInput("");

    // FR-07: the server resolves follow-ups against prior turns, so history
    // travels with the request.
    const history = turns.map((t) =>
      t.role === "user"
        ? { role: "user" as const, text: t.text }
        : { role: "assistant" as const, text: t.response.answer },
    );

    setTurns((prev) => [...prev, { role: "user", text: question }]);
    setPendingIn(askedIn);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, sessionId }),
      });

      const response = (await res.json()) as AskResponse;
      deliver(askedIn, { role: "assistant", response });
    } catch {
      // NFR-09: degrade to escalation, not to a broken screen.
      deliver(askedIn, {
        role: "assistant",
        response: {
          id: "network-error",
          tier: 3,
          lang: detectLang(question),
          answer:
            detectLang(question) === "km"
              ? "ការតភ្ជាប់បានបរាជ័យ។ សូមព្យាយាមម្តងទៀត ឬទាក់ទងមន្ត្រី។"
              : "The connection failed. Try again, or contact an officer.",
          citations: [],
          escalate: true,
        },
      });
    } finally {
      setPendingIn(null);
    }
  }

  function startNewConversation() {
    setConversationId(newId());
    setTurns([]);
    setTrace(null);
    setHandoverError(false);
  }

  /**
   * Human handover (FR-27, FR-28).
   *
   * Posts the transcript to the server, which stores it against a reference
   * token, then opens the DG Support bot with only that token in the link. The
   * citizen's questions never enter a URL.
   *
   * The tab is opened from inside the click handler rather than after the fetch
   * resolves, because a popup blocker will discard a window.open() that is no
   * longer attributable to a user gesture — and a handover button that silently
   * does nothing is worse than one that is honestly unavailable.
   */
  async function escalate(answer: AskResponse) {
    const transcript = turns.map((t) =>
      t.role === "user"
        ? { role: "user" as const, text: t.text }
        : { role: "assistant" as const, text: t.response.answer },
    );

    const tab = window.open("", "_blank");

    try {
      const res = await fetch("/api/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerId: answer.id,
          sessionId,
          lang: answer.lang,
          transcript,
          citedIds: answer.citations.map((c) => c.id),
          ministries: [...new Set(answer.citations.map((c) => c.ministry))],
        }),
      });

      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("no handover url");

      if (tab) {
        tab.location.href = url;
      } else {
        // Popup blocked. Navigating the current tab still respects the gesture.
        window.location.href = url;
      }

      setHandoverError(false);
    } catch {
      tab?.close();
      setHandoverError(true);
    }
  }

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
          onOpenConversation={(id) => {
            const found = history.find((c) => c.id === id);
            if (!found) return;
            setConversationId(found.id);
            setTurns(found.turns as Turn[]);
            setTrace(null);
            setHandoverError(false);
          }}
          onDeleteConversation={(id) => {
            setHistory(remove(id));
            // Deleting the conversation on screen leaves the citizen looking at
            // something they just deleted, which reads as the delete failing.
            if (id === conversationId) startNewConversation();
          }}
          onClearHistory={() => {
            setHistory(clearAll());
            startNewConversation();
          }}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex shrink-0 items-center gap-3 px-4 py-2.5"
          style={{
            background: T.paper,
            borderBottom: `1px solid ${T.line}`,
          }}
        >
          <button
            onClick={() => setSidebar((s) => !s)}
            className="hidden rounded-lg p-1.5 transition-colors md:block"
            style={{ color: T.inkFaint }}
            aria-label={UI.toggleSidebar[lang]}
            aria-expanded={sidebar}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.lineSoft;
              e.currentTarget.style.color = T.deep;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = T.inkFaint;
            }}
          >
            {sidebar ? (
              <ChevronLeft size={17} aria-hidden />
            ) : (
              <ChevronRight size={17} aria-hidden />
            )}
          </button>

          <div className="flex items-baseline gap-1 md:hidden">
            <span style={{ fontWeight: 700, fontSize: 16.5, color: T.deep }}>
              AskGov
            </span>
            <span className="ag-mono" style={{ fontSize: 9, color: T.sky }}>
              .kh
            </span>
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
