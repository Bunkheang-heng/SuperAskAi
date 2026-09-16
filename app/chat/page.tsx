/**
 * Citizen chat — moved off `/` so the FormKH-style marketing landing can live
 * at the root. Coverage is still derived from the loaded corpus at request time.
 */

import { Chat } from "@/components/chat";
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

  return <Chat coverage={coverage} />;
}
