/** Public HTTPS URL of the SuperAsk chat Mini App. */
export function miniAppUrl(): string {
  const explicit = process.env.TELEGRAM_MINI_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return `${app.replace(/\/$/, "")}/chat`;

  // Production default for the current Vercel alias.
  return "https://askgov-one.vercel.app/chat";
}
