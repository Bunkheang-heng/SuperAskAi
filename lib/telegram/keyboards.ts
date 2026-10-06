import { miniAppUrl } from "./config";

/**
 * Persistent keyboard: Mini App button + optional text hint.
 * `web_app` opens SuperAsk inside Telegram; users can still type below it.
 */
export function mainReplyKeyboard() {
  return {
    keyboard: [
      [
        {
          text: "Open SuperAsk App",
          web_app: { url: miniAppUrl() },
        },
      ],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/** Inline button on the welcome message. */
export function welcomeInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "Open Mini App",
          web_app: { url: miniAppUrl() },
        },
      ],
    ],
  };
}
