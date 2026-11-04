/**
 * Public channel links shown on the marketing site and in the chat header.
 *
 * MOCK fallbacks: set NEXT_PUBLIC_TELEGRAM_BOT (username, no @) and
 * NEXT_PUBLIC_MESSENGER_URL in the environment once the real handles exist.
 */

export const TELEGRAM_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT?.trim().replace(/^@/, "") ||
  "SuperAskKH_bot";

export const TELEGRAM_HANDLE = `@${TELEGRAM_BOT}`;

export const TELEGRAM_URL = `https://t.me/${TELEGRAM_BOT}`;

export const MESSENGER_URL =
  process.env.NEXT_PUBLIC_MESSENGER_URL?.trim() || "https://m.me/superaskkh";
