/**
 * BM25 keyword retrieval (FR-12, keyword half of the hybrid).
 *
 * Operates over the shared segmenter (FR-05), so Khmer text is tokenised the
 * same way at index time and query time. The document field for each chunk is
 * its text PLUS its generated candidate questions (FR-44) — indexing the
 * questions is what lets a colloquially-phrased query match a formally-worded
 * legal provision, and is the single biggest lever on Khmer recall (R-07).
 */

import type { Chunk } from "@/lib/types";
import { segment } from "@/lib/khmer/segment";

const K1 = 1.5;
const B = 0.75;

interface Indexed {
  chunk: Chunk;
  tf: Map<string, number>;
  length: number;
}

export class Bm25Index {
  private docs: Indexed[] = [];
  private df = new Map<string, number>();
  private avgLength = 0;

  constructor(chunks: Chunk[]) {
    for (const chunk of chunks) {
      // Superseded content is excluded from retrieval (FR-18, FR-58).
      if (chunk.superseded) continue;

      const field = [
        chunk.text,
        chunk.textKm ?? "",
        chunk.questions.join(" "),
        chunk.keywords.join(" "),
        chunk.doc,
        chunk.ministry,
        chunk.ministryKm,
      ].join(" ");

      const tokens = segment(field);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);

      this.docs.push({ chunk, tf, length: tokens.length });
    }

    this.avgLength =
      this.docs.reduce((sum, d) => sum + d.length, 0) / (this.docs.length || 1);
  }

  private idf(term: string): number {
    const n = this.docs.length;
    const df = this.df.get(term) ?? 0;
    // Standard BM25 idf with the +1 guard, so a term in every document scores
    // near zero rather than negative.
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  /** Raw BM25 score per chunk id for the given query terms. */
  score(queryTerms: string[]): Map<string, number> {
    const out = new Map<string, number>();

    for (const doc of this.docs) {
      let score = 0;
      for (const term of queryTerms) {
        const f = doc.tf.get(term);
        if (!f) continue;
        const norm =
          f * (K1 + 1) /
          (f + K1 * (1 - B + B * (doc.length / (this.avgLength || 1))));
        score += this.idf(term) * norm;
      }
      if (score > 0) out.set(doc.chunk.id, score);
    }

    return out;
  }
}
