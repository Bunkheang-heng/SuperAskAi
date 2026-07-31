/**
 * Retrieval orchestration: query processing → hybrid retrieval → fusion →
 * reranking. This is the whole of section 10.3's "query processing" and
 * "retrieval" layers.
 *
 * Phase 0 sequencing note (section 13): generation work is gated behind
 * retrieval recall meeting its threshold, because strong generation over weak
 * retrieval produces confident incorrect answers. That is why this module is
 * measurable in isolation — see scripts/eval.ts.
 */

import type { Candidate, Chunk } from "@/lib/types";
import { normalize, normalizeFold } from "@/lib/khmer/normalize";
import { segment } from "@/lib/khmer/segment";
import { romanizeToKhmer, looksRomanised } from "@/lib/khmer/romanize";
import { getKb } from "@/lib/kb/loader";
import { fuse, MAX_RRF } from "./rrf";
import { rerankOne } from "./rerank";

export interface ProcessedQuery {
  raw: string;
  normalised: string;
  segments: string[];
  expanded: string[];
  romanised: boolean;
  rewritten?: string;
}

/**
 * Resolve a follow-up against the prior turn (FR-07).
 *
 * "And the fee?" carries no retrievable content on its own. Rather than send
 * the whole history into retrieval — which dilutes the query — we prepend the
 * last user turn when the current one is short and looks anaphoric.
 */
function rewriteWithContext(
  question: string,
  history: Array<{ role: "user" | "assistant"; text: string }>,
): string | undefined {
  const tokens = segment(question);
  const short = tokens.length <= 5;
  const anaphoric =
    /^(and|what about|how about|then|also|ok|that one|it|this)\b/i.test(
      question.trim(),
    ) || /^(ហើយ|ចុះ|អញ្ចឹង)/.test(question.trim());

  if (!short && !anaphoric) return undefined;

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return undefined;

  return `${lastUser.text} ${question}`;
}

/** Alias expansion (FR-06): colloquial → official terminology. */
function expand(query: string): string[] {
  const { aliases } = getKb();
  const q = normalizeFold(query);
  const added = new Set<string>();

  for (const [colloquial, official] of Object.entries(aliases)) {
    if (q.includes(normalizeFold(colloquial))) {
      official.forEach((o) => added.add(o));
    }
  }

  return [...added];
}

export function processQuery(
  question: string,
  history: Array<{ role: "user" | "assistant"; text: string }> = [],
): ProcessedQuery {
  const rewritten = rewriteWithContext(question, history);
  const base = rewritten ?? question;

  const romanised = looksRomanised(base);
  // FR-03: normalise romanised Khmer to Khmer script before anything else.
  const scripted = romanised ? romanizeToKhmer(base) : base;

  const normalised = normalize(scripted);
  const expanded = expand(normalised);

  return {
    raw: question,
    normalised,
    segments: segment(normalised),
    expanded,
    romanised,
    rewritten,
  };
}

const FUSE_DEPTH = 12;

export interface RetrievalResult {
  query: ProcessedQuery;
  candidates: Candidate[];
  /** Top rerank score, normalised 0–1. Drives the FR-16 escalation decision. */
  topScore: number;
}

/**
 * Hybrid retrieval over currently-effective content.
 *
 * @param topK how many reranked candidates to return. M-03 measures recall at
 *   8, so 8 is the default the metric is defined against.
 */
export function retrieve(
  question: string,
  history: Array<{ role: "user" | "assistant"; text: string }> = [],
  topK = 8,
): RetrievalResult {
  const kb = getKb();
  const query = processQuery(question, history);

  // Alias terms join the lexical query but not the dense one: they are
  // vocabulary substitutions, and appending them to the embedding input shifts
  // the vector away from what the citizen actually asked.
  const lexicalTerms = [
    ...query.segments,
    ...query.expanded.flatMap((t) => segment(t)),
  ];

  const lexical = kb.bm25.score(lexicalTerms);
  const dense = kb.vectors.score(query.normalised);
  const fused = fuse(lexical, dense);

  const shortlist = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, FUSE_DEPTH)
    .map(([id]) => kb.byId.get(id))
    .filter((c): c is Chunk => Boolean(c));

  const candidates: Candidate[] = shortlist
    .map((chunk) => ({
      chunk,
      lexical: lexical.get(chunk.id) ?? 0,
      dense: dense.get(chunk.id) ?? 0,
      fused: (fused.get(chunk.id) ?? 0) / MAX_RRF,
      rerank: rerankOne(query.normalised, chunk),
      cited: false,
    }))
    // FR-13: the rerank score, not the fused score, determines final order.
    .sort((a, b) => b.rerank - a.rerank)
    .slice(0, topK);

  return {
    query,
    candidates,
    topScore: candidates[0]?.rerank ?? 0,
  };
}
