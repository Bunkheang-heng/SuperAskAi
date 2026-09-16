/**
 * The source receipt — the signature element of the interface.
 *
 * FR-62 is the requirement that shapes it: source attribution is a PERSISTENT
 * element beneath the answer, not something behind an optional control. A
 * citizen who has to click to find out where an answer came from will not click,
 * and the traceability the whole platform rests on (BR-002, G-02) becomes
 * decorative.
 *
 * Every field FR-63 enumerates is present and always visible: owning ministry,
 * document title, legal instrument, article reference, effective date, last
 * verified date, plus the FR-64 freshness indicator and the FR-23 link to the
 * original.
 */

import { ExternalLink } from "lucide-react";
import type { Citation, Lang } from "@/lib/types";
import { T, monoStack } from "@/lib/ui/theme";
import { UI } from "@/lib/ui/copy";
import { FreshnessBadge } from "./FreshnessBadge";

export function SourceCard({
  citation,
  lang,
}: {
  citation: Citation;
  lang: Lang;
}) {
  return (
    <div
      className="rounded-xl py-3.5 pl-4 pr-4"
      style={{
        background: T.paper,
        border: `1px solid ${T.line}`,
        // The left rule is the visual anchor that says "this is provenance",
        // repeated identically on every source card in the product.
        borderLeft: `3px solid ${T.deep}`,
        boxShadow: T.shadowSm,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.6 }}>
            {citation.ministry}
          </div>
          <div className="km" style={{ fontSize: 11.5, color: T.inkSoft }}>
            {citation.ministryKm}
          </div>
        </div>
        <FreshnessBadge freshness={citation.freshness} lang={lang} />
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: T.ink,
          marginTop: 8,
          lineHeight: 1.7,
        }}
      >
        {citation.doc}
      </div>

      <div
        className="ag-mono"
        style={{
          fontSize: 10.5,
          color: T.inkSoft,
          marginTop: 2,
          lineHeight: 1.8,
        }}
      >
        {citation.instrument} · {citation.article}
        <br />
        {UI.effective[lang]} {citation.effective} · {UI.lastVerified[lang]}{" "}
        {citation.verified}
      </div>

      {citation.url && (
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex items-center gap-1.5 rounded transition-colors"
          // skyDeep, not sky: #26A1DA measures about 2.9:1 on white and this is
          // 11.5px text, so the lighter brand blue would fail WCAG AA here.
          style={{ fontSize: 11.5, color: T.skyDeep, fontWeight: 600 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.deep)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.skyDeep)}
        >
          {UI.openSource[lang]}
          <ExternalLink size={11} aria-hidden />
        </a>
      )}
    </div>
  );
}
