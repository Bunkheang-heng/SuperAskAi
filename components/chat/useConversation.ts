"use client";

/**
 * Conversation state for the citizen chat (section 8.9).
 *
 * Ask, history, pending, escalate, and deliver live here so Chat.tsx is the
 * layout. All model access still goes through POST /api/ask.
 */

import { useEffect, useRef, useState } from "react";
import type { AskResponse, Lang } from "@/lib/types";
import { detectLang } from "@/lib/lang/detect";
import {
  clearAll,
  loadAll,
  remove,
  save,
  type Conversation,
  type StoredTurn,
} from "@/lib/ui/history";

export type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; response: AskResponse };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useConversation() {
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
   * Device-local conversation history (lib/ui/history.ts). Loaded after mount, not
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

  // Kept for callers that still read conversation lang. Chat UI chrome uses
  // useSiteLang instead; answer language is chosen per-question via detectLang.
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
   * a shared handset (see lib/ui/history.ts) it would be a disclosure.
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

  function openConversation(id: string) {
    const found = history.find((c) => c.id === id);
    if (!found) return;
    setConversationId(found.id);
    setTurns(found.turns as Turn[]);
    setTrace(null);
    setHandoverError(false);
  }

  function deleteConversation(id: string) {
    setHistory(remove(id));
    // Deleting the conversation on screen leaves the citizen looking at
    // something they just deleted, which reads as the delete failing.
    if (id === conversationId) startNewConversation();
  }

  function clearHistory() {
    setHistory(clearAll());
    startNewConversation();
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

  return {
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
  };
}
