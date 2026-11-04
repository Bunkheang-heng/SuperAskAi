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
 * original. Styled as the Figma's "Verified source" block: ice-blue panel,
 * teal status dot.
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
  const fresh = citation.freshness === "fresh";
  return (
    <div
      className="flex items-start gap-2.5 rounded-[10px] px-3.5 py-3"
      style={{ background: T.skyWash, border: `1px solid ${T.skyLine}` }}
    >
      <span
        aria-hidden
        className="mt-[7px] shrink-0 rounded-full"
        style={{ width: 7, height: 7, background: fresh ? T.teal : T.notice }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: fresh ? T.tealText : T.inkSoft,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              lineHeight: 1.8,
            }}
          >
            {fresh ? UI.verifiedSource[lang] : UI.sourceOne[lang]}
          </div>
          <FreshnessBadge freshness={citation.freshness} lang={lang} />
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, lineHeight: 1.6 }}>
          {citation.ministry}
        </div>
        <div className="km" style={{ fontSize: 11.5, color: T.inkSoft }}>
          {citation.ministryKm}
        </div>

        <div style={{ fontSize: 12.5, color: T.ink, marginTop: 6, lineHeight: 1.7 }}>
          {citation.doc}
        </div>

        <div
          style={{
            fontFamily: monoStack,
            fontSize: 10.5,
            color: T.inkSoft,
            marginTop: 2,
            lineHeight: 1.8,
          }}
        >
          {citation.instrument} · {citation.article}
          <br />
          {UI.effective[lang]} {citation.effective} ·{" "}
          <span style={{ color: fresh ? T.tealText : T.inkSoft, fontWeight: 600 }}>
            {UI.lastVerified[lang]} {citation.verified}
          </span>
        </div>

        {citation.url && (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded transition-colors hover:underline"
            style={{ fontSize: 11.5, color: T.sky, fontWeight: 600 }}
          >
            {UI.openSource[lang]}
            <ExternalLink size={11} aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}
