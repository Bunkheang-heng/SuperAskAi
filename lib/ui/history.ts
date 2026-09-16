/**
 * Conversation history — device-local only.
 *
 * ── WHY THIS DOES NOT TOUCH THE SERVER ─────────────────────────────────────
 * A citizen's question list is sensitive. The queries this service receives are
 * about births, deaths, lost identity documents, late registrations, and money
 * owed — and section 5.1 describes an audience that is mobile-only and often on
 * a shared or family handset. A server-side history would mean storing an
 * identifiable trail of that, which engages NFR-11 (residency), NFR-12 (data
 * protection principles apply notwithstanding any public authority exemption),
 * and NFR-13 (retention limits), and would need a lawful basis the initial
 * release does not have — section 6.2 puts personal data lookup out of scope for
 * exactly this reason.
 *
 * So history lives in localStorage, on the device, and is never transmitted.
 * The audit log (FR-55) is a separate, redacted, operational record; it is not
 * this and must not be joined to it.
 *
 * Because the device may be shared, clearing has to be one obvious tap rather
 * than buried in a settings screen. See clearAll().
 * ───────────────────────────────────────────────────────────────────────────
 */

import type { AskResponse } from "@/lib/types";

const KEY = "askgov.history.v1";
const LEGACY_KEY = "superask.history.v1";

/** Keep the list short: it is a convenience, not an archive. */
const MAX_CONVERSATIONS = 20;

export type StoredTurn =
  | { role: "user"; text: string }
  | { role: "assistant"; response: AskResponse };

export interface Conversation {
  id: string;
  /** Derived from the first citizen turn. */
  title: string;
  /** Epoch millis of the last turn. */
  at: number;
  turns: StoredTurn[];
}

function canStore(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    // Storage access throws rather than returning null when blocked by policy
    // or in private browsing on some engines.
    return false;
  }
}

function readStored(): string | null {
  const current = window.localStorage.getItem(KEY);
  if (current) return current;
  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  try {
    window.localStorage.setItem(KEY, legacy);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Copy failed; still serve the old key so a rename does not wipe history.
  }
  return legacy;
}

export function loadAll(): Conversation[] {
  if (!canStore()) return [];
  try {
    const raw = readStored();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (c): c is Conversation =>
          Boolean(c) &&
          typeof (c as Conversation).id === "string" &&
          Array.isArray((c as Conversation).turns),
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    // Corrupt or foreign data in our key. Losing history is a minor
    // inconvenience; throwing on every page load is not acceptable.
    return [];
  }
}

function persist(list: Conversation[]): void {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(list.slice(0, MAX_CONVERSATIONS)),
    );
  } catch {
    // Quota exceeded, or storage disabled mid-session. Drop the oldest half and
    // try once; if that also fails, history silently stops growing rather than
    // breaking the conversation the citizen is having right now.
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify(list.slice(0, Math.floor(MAX_CONVERSATIONS / 2))),
      );
    } catch {
      /* give up */
    }
  }
}

function titleFrom(turns: StoredTurn[]): string {
  const first = turns.find((t) => t.role === "user");
  const text = first && first.role === "user" ? first.text : "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || "New question";
}

/** Insert or update one conversation, newest first. */
export function save(id: string, turns: StoredTurn[]): Conversation[] {
  if (turns.length === 0) return loadAll();

  const list = loadAll().filter((c) => c.id !== id);
  const next: Conversation[] = [
    { id, title: titleFrom(turns), at: Date.now(), turns },
    ...list,
  ];

  persist(next);
  return next.slice(0, MAX_CONVERSATIONS);
}

export function remove(id: string): Conversation[] {
  const next = loadAll().filter((c) => c.id !== id);
  persist(next);
  return next;
}

/**
 * Delete every stored conversation. Reachable in one tap from the sidebar,
 * because on a shared handset the citizen who needs it needs it immediately.
 */
export function clearAll(): Conversation[] {
  if (canStore()) {
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* nothing further we can do */
    }
  }
  return [];
}
