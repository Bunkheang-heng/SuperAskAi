/**
 * DG Support handover configuration (D-04, FR-27).
 *
 * Phase 0 channel is Telegram (§13: "Channels — Telegram, text only"), so the
 * handover target is the DG Support bot.
 */

/** Bot username without the leading @. */
export const SUPPORT_BOT =
  process.env.SUPPORT_TELEGRAM_BOT?.trim().replace(/^@/, "") || "DGSupportKH_bot";

export const SUPPORT_HANDLE = `@${SUPPORT_BOT}`;

/**
 * Telegram deep-link start parameters accept 1–64 characters of
 * `A-Z a-z 0-9 _ -` only. Anything else is silently dropped by the client, which
 * would produce a handover the bot cannot resolve and a citizen who has to
 * repeat themselves anyway — the exact failure FR-28 exists to prevent.
 */
const START_PARAM = /^[A-Za-z0-9_-]{1,64}$/;

/** Reference token for one handover. Derived from the answer id, no PII. */
export function escalationRef(answerId: string): string {
  const token = `ref${answerId.replace(/-/g, "")}`.slice(0, 64);
  return START_PARAM.test(token) ? token : `ref${Date.now().toString(36)}`;
}

/**
 * Deep link that opens the DG Support bot. The token is the ONLY thing that
 * travels in the URL; the transcript stays server side (see recordEscalation).
 */
export function supportLink(ref: string): string {
  return `https://t.me/${SUPPORT_BOT}?start=${ref}`;
}
