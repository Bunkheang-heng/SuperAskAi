/**
 * Content freshness (FR-26, FR-52, FR-64, M-05).
 *
 * Freshness is computed from the review date on the content version, not from
 * when the answer was generated. Content that has passed its review date is
 * flagged and the citizen is advised to confirm with the responsible office
 * (FR-26); content approaching it is marked so a steward sees the pressure
 * before it becomes a stale-content incident (R-03).
 */

import type { Chunk, Freshness } from "@/lib/types";

const DUE_WINDOW_DAYS = 30;

export function freshnessOf(chunk: Chunk, now = new Date()): Freshness {
  const due = new Date(chunk.reviewDue);
  if (Number.isNaN(due.getTime())) return "stale";
  if (now > due) return "stale";
  const days = (due.getTime() - now.getTime()) / 86_400_000;
  return days < DUE_WINDOW_DAYS ? "due" : "fresh";
}

/** Ministry freshness score: share of content verified within 90 days (M-05). */
export function ministryFreshnessScore(
  chunks: Chunk[],
  now = new Date(),
): Map<string, { verified: number; total: number; score: number }> {
  const out = new Map<
    string,
    { verified: number; total: number; score: number }
  >();

  for (const chunk of chunks) {
    if (chunk.superseded) continue;
    const entry = out.get(chunk.ministry) ?? { verified: 0, total: 0, score: 0 };
    entry.total += 1;

    const verified = new Date(chunk.verified);
    const days = (now.getTime() - verified.getTime()) / 86_400_000;
    if (!Number.isNaN(days) && days <= 90) entry.verified += 1;

    out.set(chunk.ministry, entry);
  }

  for (const entry of out.values()) {
    entry.score = entry.total === 0 ? 0 : entry.verified / entry.total;
  }

  return out;
}

/** Advisory appended where any cited source has passed its review date. */
export const STALE_NOTICE = {
  en: "One or more sources for this answer has passed its review date. Confirm with the responsible office before acting on it.",
  km: "ឯកសារយោងមួយ ឬច្រើនសម្រាប់ចម្លើយនេះបានហួសកាលបរិច្ឆេទត្រួតពិនិត្យ។ សូមផ្ទៀងផ្ទាត់ជាមួយការិយាល័យទទួលបន្ទុកមុននឹងអនុវត្ត។",
};
