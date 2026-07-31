/**
 * Visual freshness indicator derived from the content review date (FR-64).
 *
 * Deliberately not a brand blue. A citizen has to be able to tell at a glance
 * that a source is past its review date, and a badge in the same palette as the
 * rest of the card does not carry that signal. Colour is also not the only
 * channel — the label is spelled out, because a red/green distinction alone
 * fails for colour-blind citizens and in bright outdoor sunlight, which is a
 * real reading condition for this audience.
 */

import type { Freshness, Lang } from "@/lib/types";
import { T, monoStack } from "@/lib/theme";
import { UI } from "@/lib/ui-copy";

const STYLES: Record<Freshness, { fg: string; bg: string; border: string }> = {
  fresh: { fg: T.green, bg: T.greenWash, border: "#BFE3D4" },
  due: { fg: T.noticeText, bg: T.noticeWash, border: T.noticeLine },
  stale: { fg: T.red, bg: T.redWash, border: "#EFC9C9" },
};

export function FreshnessBadge({
  freshness,
  lang,
}: {
  freshness: Freshness;
  lang: Lang;
}) {
  const s = STYLES[freshness];
  const label =
    freshness === "fresh"
      ? UI.verified[lang]
      : freshness === "due"
        ? UI.reviewDue[lang]
        : UI.stale[lang];

  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 whitespace-nowrap"
      style={{
        fontFamily: lang === "km" ? undefined : monoStack,
        fontSize: 9.5,
        letterSpacing: lang === "km" ? undefined : "0.05em",
        textTransform: lang === "km" ? undefined : "uppercase",
        lineHeight: 1.6,
        color: s.fg,
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      {label}
    </span>
  );
}
