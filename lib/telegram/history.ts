/**
 * Short per-chat history for Telegram multi-turn.
 *
 * Lives on globalThis so warm Vercel instances keep context. Cold starts lose
 * it — that is acceptable for Phase 0; the engine still answers single turns.
 */

type Turn = { role: "user" | "assistant"; text: string };

const MAX_TURNS = 8;
const MAX_CHATS = 500;

type Store = Map<number, Turn[]>;

function store(): Store {
  const g = globalThis as typeof globalThis & { __superaskTgHistory?: Store };
  if (!g.__superaskTgHistory) g.__superaskTgHistory = new Map();
  return g.__superaskTgHistory;
}

export function getHistory(chatId: number): Turn[] {
  return store().get(chatId) ?? [];
}

export function appendTurn(
  chatId: number,
  role: "user" | "assistant",
  text: string,
): void {
  const s = store();
  const prev = s.get(chatId) ?? [];
  const next = [...prev, { role, text }].slice(-MAX_TURNS);
  s.set(chatId, next);

  // Bound memory if many distinct chats hit one warm instance.
  if (s.size > MAX_CHATS) {
    const first = s.keys().next().value;
    if (first !== undefined) s.delete(first);
  }
}
