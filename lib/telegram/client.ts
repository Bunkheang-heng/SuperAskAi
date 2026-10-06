/**
 * Thin Telegram Bot API client.
 *
 * Token lives in TELEGRAM_BOT_TOKEN only — never in source, never in the client.
 */

const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

async function call<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as {
    ok: boolean;
    description?: string;
    result: T;
  };
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

export type ReplyMarkup =
  | {
      keyboard: Array<Array<Record<string, unknown>>>;
      resize_keyboard?: boolean;
      is_persistent?: boolean;
    }
  | {
      inline_keyboard: Array<Array<Record<string, unknown>>>;
    }
  | { remove_keyboard: true };

export async function sendChatAction(
  chatId: number,
  action: "typing" = "typing",
): Promise<void> {
  await call("sendChatAction", { chat_id: chatId, action });
}

export async function sendMessage(
  chatId: number,
  text: string,
  extra?: {
    replyToMessageId?: number;
    replyMarkup?: ReplyMarkup;
  },
): Promise<void> {
  // Telegram hard-caps a single message at 4096 characters.
  const chunks = splitMessage(text, 4000);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await call("sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      reply_to_message_id: extra?.replyToMessageId,
      disable_web_page_preview: true,
      // Attach the keyboard only once, on the last chunk.
      ...(isLast && extra?.replyMarkup
        ? { reply_markup: extra.replyMarkup }
        : {}),
    });
  }
}

/** HTTPS URL of the SuperAsk Mini App (usually /chat). */
export function miniAppUrl(): string {
  const fromEnv = process.env.TELEGRAM_MINI_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return `${site.replace(/\/$/, "")}/chat`;
  return "https://askgov-one.vercel.app/chat";
}

/** Persistent keyboard: Mini App + keep chatting by text. */
export function channelKeyboard(appUrl: string = miniAppUrl()): ReplyMarkup {
  return {
    keyboard: [
      [{ text: "Open SuperAsk app", web_app: { url: appUrl } }],
      [{ text: "Ask by text" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export async function setWebhook(url: string, secret: string): Promise<void> {
  await call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
}

/** Menu button (⋮ / side button) opens the Mini App inside Telegram. */
export async function setMenuButton(appUrl: string = miniAppUrl()): Promise<void> {
  await call("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "SuperAsk",
      web_app: { url: appUrl },
    },
  });
}

export async function getWebhookInfo(): Promise<{
  url: string;
  pending_update_count: number;
  last_error_message?: string;
}> {
  return call("getWebhookInfo");
}

function splitMessage(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = max;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}
