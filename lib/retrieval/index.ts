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
import { isSubjectless } from "@/lib/lang/content";
import { getKb } from "@/lib/kb/loader";
import { fuse, MAX_RRF } from "./rrf";
import { rerankOne } from "./rerank";
import { inScopeHistory, isOffDomain } from "@/lib/engine/guardrails";

export interface ProcessedQuery {
  raw: string;
  normalised: string;
  segments: string[];
  expanded: string[];
  romanised: boolean;
  rewritten?: string;
}

/**
 * How far back to look for a turn that names what the citizen is asking about.
 * Four covers a run of short follow-ups without dragging in a topic the
 * conversation has genuinely moved on from.
 */
const MAX_ANCHOR_LOOKBACK = 4;

/** Anaphoric openers: the question refers back rather than naming its subject. */
const ANAPHORIC =
  /^(and|what about|how about|then|also|ok|that one|it|this)\b/i;
const ANAPHORIC_KM = /^(ហើយ|ចុះ|អញ្ចឹង)/;

/**
 * Resolve a follow-up against the conversation so far (FR-07).
 *
 * "And the fee?" carries no retrievable content on its own, so it is resolved
 * against an earlier turn. The earlier turn has to actually name something,
 * which is where this used to fail:
 *
 *   1. "i dont have a passport, what do i need to bring…"   ← names the subject
 *   2. "can you give me the specific locations?"            ← names nothing
 *   3. "where in phnom penh?"                               ← names nothing
 *
 * Prepending only turn 2 to turn 3 produced "can you give me the specific
 * locations? where in phnom penh?" — a query with no subject at all, which then
 * matched the office-and-opening-hours passages of whatever the corpus happens
 * to contain. A passport question came back answered with driving-licence and
 * vehicle-registration locations, cited and confident.
 *
 * So walk back until a turn that carries content words, and keep the
 * subject-less turns in between: they are the ones narrowing the question
 * ("locations", "in phnom penh"), and dropping them loses the refinement even
 * though they cannot anchor it.
 */
function rewriteWithContext(
  question: string,
  history: Array<{ role: "user" | "assistant"; text: string }>,
): string | undefined {
  const trimmed = question.trim();
  const anaphoric = ANAPHORIC.test(trimmed) || ANAPHORIC_KM.test(trimmed);
  const usable = inScopeHistory(history);

  // A question that is in-scope on its own is a new topic, not a follow-up.
  // "how do I get married?" has one content word so the old short/subjectless
  // test treated it as a refinement and prepended whatever came before —
  // including "who is elon musk?". Anaphoric openers ("and the fee?") still
  // rewrite: they name a service term but clearly point at the prior turn.
  const standsAlone = !isOffDomain(question, []);
  if (!anaphoric && standsAlone) return undefined;
  if (!anaphoric && isOffDomain(question, usable)) return undefined;

  const priorUserTurns = usable
    .filter((m) => m.role === "user")
    .reverse()
    .slice(0, MAX_ANCHOR_LOOKBACK);

  const picked: string[] = [];
  for (const turn of priorUserTurns) {
    picked.push(turn.text);
    // Stop at the first turn that says what the conversation is about.
    if (!isSubjectless(turn.text)) break;
  }

  if (picked.length === 0) return undefined;

  return `${picked.reverse().join(" ")} ${question}`;
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

/**
 * How many fused candidates the reranker sees.
 *
 * Measured, not chosen: fusion puts the correct chunk inside the top 12 for
 * 94.1% of the golden set, and the reranker drops none of them from its top 8 —
 * so widening this only feeds the reranker more chances to promote a wrong
 * chunk above the right one. Narrowing 12 → 8 lifted Recall@1 by ~3 points at
 * no cost to Recall@8. Revisit when the reranker is a trained cross-encoder;
 * a stronger reranker earns a deeper shortlist.
 */
const FUSE_DEPTH = 8;

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
