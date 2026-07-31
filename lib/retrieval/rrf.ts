/**
 * Reciprocal rank fusion (FR-12).
 *
 * BM25 scores and cosine similarities are not on a comparable scale, so they
 * cannot be added or weighted directly without one signal dominating for
 * reasons that have nothing to do with relevance. RRF discards the magnitudes
 * and fuses the RANKS instead, which is why it is the standard choice for
 * hybrid retrieval and why it needs no per-corpus tuning.
 *
 *   RRF(d) = Σ  1 / (k + rank_i(d))
 */

const K = 60;

function ranks(scores: Map<string, number>): Map<string, number> {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const out = new Map<string, number>();
  sorted.forEach(([id], i) => out.set(id, i + 1));
  return out;
}

export function fuse(
  lexical: Map<string, number>,
  dense: Map<string, number>,
): Map<string, number> {
  const lexRanks = ranks(lexical);
  const denseRanks = ranks(dense);
  const ids = new Set([...lexical.keys(), ...dense.keys()]);
  const out = new Map<string, number>();

  for (const id of ids) {
    let score = 0;
    const lr = lexRanks.get(id);
    const dr = denseRanks.get(id);
    if (lr !== undefined) score += 1 / (K + lr);
    if (dr !== undefined) score += 1 / (K + dr);
    out.set(id, score);
  }

  return out;
}

/** Maximum attainable RRF score, for normalising to a 0–1 confidence band. */
export const MAX_RRF = 2 / (K + 1);
