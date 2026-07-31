/**
 * Dense vector retrieval (FR-12, dense half of the hybrid).
 *
 * ── WHAT THIS IS AND IS NOT ────────────────────────────────────────────────
 * This is NOT a neural embedding model. It is a deterministic hashed
 * character-n-gram vector with cosine similarity: a stand-in that gives the
 * hybrid pipeline a real second retrieval signal with different failure modes
 * from BM25, and that works offline with no model dependency.
 *
 * It is a placeholder for a trained multilingual embedding model, which Phase 0
 * week 1–3 benchmarks against the Khmer golden question set before selection.
 * Swapping it is a change to `embed()` alone — the index, fusion, and reranking
 * above it are unchanged.
 *
 * Character n-grams are chosen deliberately: they degrade gracefully on Khmer
 * without depending on segmentation being correct, so a segmentation miss costs
 * lexical recall but not dense recall. That is the point of a hybrid.
 * ───────────────────────────────────────────────────────────────────────────
 */

import type { Chunk } from "@/lib/types";
import { normalizeFold } from "@/lib/khmer/normalize";

const DIMS = 512;
const NGRAM_MIN = 2;
const NGRAM_MAX = 4;

/** FNV-1a, for a stable hash across processes and runs. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** L2-normalised hashed character-n-gram vector. */
export function embed(text: string): Float32Array {
  const s = normalizeFold(text);
  const vec = new Float32Array(DIMS);
  const chars = Array.from(s);

  for (let n = NGRAM_MIN; n <= NGRAM_MAX; n += 1) {
    for (let i = 0; i + n <= chars.length; i += 1) {
      const gram = chars.slice(i, i + n).join("");
      if (gram.trim().length === 0) continue;
      const idx = hash(gram) % DIMS;
      // Sign hashing keeps unrelated grams from only ever adding mass.
      const sign = (hash(gram + "#") & 1) === 0 ? 1 : -1;
      // Longer n-grams carry more signal than shorter ones.
      vec[idx] += sign * (n / NGRAM_MAX);
    }
  }

  let mag = 0;
  for (let i = 0; i < DIMS; i += 1) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag) || 1;
  for (let i = 0; i < DIMS; i += 1) vec[i] /= mag;

  return vec;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < DIMS; i += 1) dot += a[i] * b[i];
  return dot;
}

export class VectorIndex {
  private entries: Array<{ id: string; vec: Float32Array }> = [];

  constructor(chunks: Chunk[]) {
    for (const chunk of chunks) {
      if (chunk.superseded) continue;

      // Embed the questions separately from the body and keep the best match
      // per chunk. Averaging a legal provision with six colloquial questions
      // produces a vector that resembles neither.
      const fields = [
        chunk.text,
        chunk.textKm ?? "",
        ...chunk.questions,
      ].filter((f) => f.trim().length > 0);

      for (const field of fields) {
        this.entries.push({ id: chunk.id, vec: embed(field) });
      }
    }
  }

  /** Best cosine similarity per chunk id, mapped from [-1,1] to [0,1]. */
  score(query: string): Map<string, number> {
    const q = embed(query);
    const best = new Map<string, number>();

    for (const entry of this.entries) {
      const sim = (cosine(q, entry.vec) + 1) / 2;
      const prev = best.get(entry.id);
      if (prev === undefined || sim > prev) best.set(entry.id, sim);
    }

    return best;
  }
}
