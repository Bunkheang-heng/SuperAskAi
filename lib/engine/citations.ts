/**
 * Citation assembly and the FR-29 office block.
 */

import type { Chunk, Citation, Lang } from "@/lib/types";
import { getKb } from "@/lib/kb/loader";
import { freshnessOf } from "./freshness";

export function toCitation(chunk: Chunk, lang: Lang): Citation {
  return {
    id: chunk.id,
    ministry: chunk.ministry,
    ministryKm: chunk.ministryKm,
    doc: chunk.doc,
    instrument: chunk.instrument,
    article: chunk.article,
    url: chunk.url,
    effective: chunk.effective,
    verified: chunk.verified,
    reviewDue: chunk.reviewDue,
    freshness: freshnessOf(chunk),
    quote: lang === "km" && chunk.textKm ? chunk.textKm : chunk.text,
  };
}

/**
 * FR-29 — responsible office contact details where human handover is
 * unavailable. Still returned in the payload; the interface currently surfaces
 * the DG Support handover instead of rendering a block of placeholder numbers.
 */
export function supportOffice() {
  const { support } = getKb();
  return {
    name: support.name,
    address: support.address,
    hours: support.hours,
    phone: support.phone,
  };
}
