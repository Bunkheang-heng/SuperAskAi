import type { AskResponse } from "@/lib/types";

/**
 * Render an SuperAsk answer as plain Telegram text.
 * No Markdown — Khmer + punctuation make entity parsing fragile.
 */
export function formatTelegramAnswer(res: AskResponse): string {
  const lines: string[] = [];

  lines.push(res.answer.trim());

  if (res.citations.length > 0) {
    lines.push("");
    lines.push(res.lang === "km" ? "ប្រភពផ្លូវការ:" : "Official sources:");
    for (const c of res.citations.slice(0, 3)) {
      const title = [c.instrument, c.article].filter(Boolean).join(" · ");
      const label = title || c.doc;
      if (c.url) {
        lines.push(`• ${label}\n  ${c.url}`);
      } else {
        lines.push(`• ${label}`);
      }
    }
  }

  if (res.escalate) {
    lines.push("");
    lines.push(
      res.lang === "km"
        ? "ប្រសិនបើអ្នកត្រូវការជំនួយបន្ថែម សូមសួរមន្ត្រីតាម SuperAsk នៅលើវេប។"
        : "If you need more help, ask an officer through SuperAsk on the web.",
    );
  }

  lines.push("");
  lines.push(
    res.lang === "km"
      ? "ជាព័ត៌មានតែប៉ុណ្ណោះ។ សូមផ្ទៀងផ្ទាត់ជាមួយការិយាល័យទទួលបន្ទុកមុននឹងអនុវត្ត។"
      : "Informational only. Confirm with the responsible office before acting.",
  );

  return lines.join("\n").trim();
}

export function welcomeMessage(): string {
  return [
    "SuperAsk — Cambodian government service information.",
    "",
    "You can use SuperAsk in two ways:",
    "1. Tap “Open SuperAsk app” for the full Mini App chat.",
    "2. Or just type your question here in Telegram.",
    "",
    "អ្នកអាចប្រើ SuperAsk តាមពីរវិធី៖",
    "១. ចុច “Open SuperAsk app” ដើម្បីបើក Mini App",
    "២. ឬវាយសំណួរដោយផ្ទាល់នៅទីនេះ",
    "",
    "Example / ឧទាហរណ៍:",
    "How do I renew my driving licence?",
  ].join("\n");
}

export function textModeHint(): string {
  return [
    "Sure — just type your question here.",
    "",
    "សួរសំណួររបស់អ្នកនៅទីនេះបានហើយ។",
    "",
    "Example: How do I renew my driving licence?",
  ].join("\n");
}

/** Keyboard button labels we handle as commands, not as questions. */
export const ASK_BY_TEXT_LABEL = "Ask by text";
export const OPEN_APP_LABEL = "Open SuperAsk app";
