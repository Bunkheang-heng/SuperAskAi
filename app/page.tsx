/**
 * Citizen entry point.
 *
 * A server component. Nothing about the model provider crosses to the client at
 * all now — not the name, not the hosting, not the residency — so FR-74 holds
 * by construction rather than by remembering to send only the safe fields.
 * Operators read that state from GET /api/health instead.
 */

import { Chat } from "@/components/Chat";
import { getKb } from "@/lib/kb/loader";

export default function Page() {
  /**
   * Coverage, derived from the loaded corpus rather than hardcoded.
   *
   * Showing the citizen which domains are onboarded BEFORE they ask is the fix
   * for the worst failure this interface had: a question about a service that
   * has not been onboarded produced a refusal, and a refusal reads as "this
   * service is broken" rather than "that ministry is not on the platform yet".
   * Scope you can see beforehand costs nothing; scope you discover by being
   * refused costs the citizen's trust.
   */
  const kb = getKb();
  const coverage = [...new Set(kb.chunks.filter((c) => !c.superseded).map((c) => c.ministry))]
    .map((ministry) => {
      const chunk = kb.chunks.find((c) => c.ministry === ministry)!;
      return {
        ministry,
        ministryKm: chunk.ministryKm,
        // Short label for the chip; the full ministry name is the tooltip.
        short: ministry.replace(/^Ministry of\s+/, ""),
      };
    });

  return <Chat coverage={coverage} />;
}
