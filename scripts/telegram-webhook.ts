/**
 * Register (or inspect) the Telegram webhook + Mini App menu button.
 *
 *   TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… \
 *     npx tsx scripts/telegram-webhook.ts set https://your-domain/api/telegram/webhook
 *
 *   npx tsx scripts/telegram-webhook.ts info
 *   npx tsx scripts/telegram-webhook.ts menu
 */

import {
  getWebhookInfo,
  miniAppUrl,
  setMenuButton,
  setWebhook,
} from "../lib/telegram/client";

async function main() {
  const [cmd, url] = process.argv.slice(2);
  if (!cmd || !["set", "info", "menu"].includes(cmd)) {
    console.error(
      "Usage:\n" +
        "  npx tsx scripts/telegram-webhook.ts set <https-webhook-url>\n" +
        "  npx tsx scripts/telegram-webhook.ts menu\n" +
        "  npx tsx scripts/telegram-webhook.ts info",
    );
    process.exit(1);
  }

  if (cmd === "info") {
    const info = await getWebhookInfo();
    console.log(JSON.stringify({ ...info, miniApp: miniAppUrl() }, null, 2));
    return;
  }

  if (cmd === "menu") {
    const app = miniAppUrl();
    await setMenuButton(app);
    console.log(`Menu button → Mini App ${app}`);
    return;
  }

  if (!url?.startsWith("https://")) {
    console.error("Webhook URL must be https://…");
    process.exit(1);
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("Set TELEGRAM_WEBHOOK_SECRET (random string, 8–256 chars).");
    process.exit(1);
  }

  await setWebhook(url, secret);
  const app = miniAppUrl();
  await setMenuButton(app);
  console.log(`Webhook set → ${url}`);
  console.log(`Menu button → Mini App ${app}`);
  const info = await getWebhookInfo();
  console.log(JSON.stringify(info, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
