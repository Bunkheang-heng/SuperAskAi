/**
 * Citizen chat — moved off `/` so the FormKH-style marketing landing can live
 * at the root. Coverage is still derived from the loaded corpus at request time.
 *
 * Also hosts the Telegram Mini App surface (same UI inside Telegram).
 */

import { Chat } from "@/components/chat";
import { TelegramMiniAppBoot } from "@/components/telegram/TelegramMiniAppBoot";
import { getKb } from "@/lib/kb/loader";

export default function ChatPage() {
  const kb = getKb();
  const coverage = [
    ...new Set(kb.chunks.filter((c) => !c.superseded).map((c) => c.ministry)),
  ].map((ministry) => {
    const chunk = kb.chunks.find((c) => c.ministry === ministry)!;
    return {
      ministry,
      ministryKm: chunk.ministryKm,
      short: ministry.replace(/^Ministry of\s+/, ""),
    };
  });

  return (
    <>
      <TelegramMiniAppBoot />
      <Chat coverage={coverage} />
    </>
  );
}
