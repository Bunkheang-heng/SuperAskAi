/**
 * Cross-encoder reranking (FR-13).
 *
 * Production uses a trained cross-encoder that scores (query, chunk) jointly.
 * This is a lexical-overlap reranker standing in for it: it re-scores the fused
 * candidate set using signals a bi-encoder cannot see, in particular exact
 * question-level agreement and proper-noun agreement.
 *
 * Swap point: replace `rerank()` with a model call. Everything above it is
 * unchanged. Because reranking runs only over the top ~12 fused candidates, a
 * model here costs one small inference per query, not one per chunk.
 */

import type { Chunk } from "@/lib/types";
import { segment } from "@/lib/khmer/segment";
import { normalizeFold } from "@/lib/khmer/normalize";

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/**
 * Score one candidate against the query. Range is roughly 0–1; absolute values
 * matter only in that they feed the escalation threshold (FR-16), so the
 * threshold and this function must be tuned together.
 */
export function rerankOne(query: string, chunk: Chunk): number {
  const qNorm = normalizeFold(query);
  const qTokens = new Set(segment(query));

  // 1. Best agreement with any single generated candidate question. This is
  //    the strongest available signal: the questions were written to be the
  //    citizen-side phrasing of exactly this chunk.
  let bestQuestion = 0;
  for (const q of chunk.questions) {
    const sim = jaccard(qTokens, new Set(segment(q)));
    if (sim > bestQuestion) bestQuestion = sim;
  }

  // 2. Body agreement. Lower weight — a long provision shares many tokens with
  //    any query in its domain, so this signal is noisy on its own.
  const bodyTokens = new Set(segment(`${chunk.text} ${chunk.textKm ?? ""}`));
  const body = jaccard(qTokens, bodyTokens);

  // 3. Keyword hits. Substring rather than token match, so multi-word official
  //    terms ("late registration") count once as a phrase.
  let keywordHits = 0;
  for (const k of chunk.keywords) {
    if (qNorm.includes(normalizeFold(k))) keywordHits += 1;
  }
  const keyword = Math.min(1, keywordHits / 3);

  return 0.55 * bestQuestion + 0.2 * body + 0.25 * keyword;
}

export function rerank(
  query: string,
  candidates: Chunk[],
): Array<{ chunk: Chunk; score: number }> {
  return candidates
    .map((chunk) => ({ chunk, score: rerankOne(query, chunk) }))
    .sort((a, b) => b.score - a.score);
}
