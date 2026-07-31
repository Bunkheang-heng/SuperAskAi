/**
 * Tier 1: human-approved curated answers, served verbatim with no model
 * generation (FR-10, FR-11).
 *
 * Matching is scored rather than substring-based so that the confidence
 * threshold in FR-11 is a real threshold. A curated answer served on a weak
 * match is worse than falling through to Tier 2, because it looks authoritative
 * while answering a different question.
 */

import type { Lang } from "@/lib/types";
import { segment } from "@/lib/khmer/segment";
import { normalizeFold, containsWord } from "@/lib/khmer/normalize";
import { getKb } from "@/lib/kb/loader";

export interface CuratedMatch {
  id: string;
  answer: string;
  score: number;
}

/**
 * How a curated entry is allowed to match.
 *
 * `phrase` — the phrase may appear anywhere in the question. Right for topical
 *   entries: "what services do you cover" should match inside a longer sentence.
 *
 * `whole` — the entire question must be the phrase, give or take punctuation.
 *   Required for greetings and other conversational openers. "hello" as a
 *   `phrase` entry would swallow "hello, how do I renew my licence?" and answer
 *   with a greeting instead of the procedure the citizen actually asked for.
 */
export type MatchMode = "phrase" | "whole";

/**
 * Function words carry no topical signal, and a curated phrase made only of them
 * will partially match almost anything.
 *
 * Concretely: "what do you do" reduces to the token set {what, do, you}, all
 * three of which appear in "before I start, what services do you cover?" — so it
 * scored a perfect 1.0 and served the wrong curated answer. Partial matching
 * needs content words to be about anything.
 */
const STOPWORDS = new Set([
  "what", "who", "how", "when", "where", "which", "why",
  "do", "does", "did", "is", "are", "am", "was", "were", "be", "can", "could",
  "will", "would", "should", "i", "you", "me", "my", "we", "it", "this", "that",
  "the", "a", "an", "to", "for", "of", "and", "or", "in", "on", "at", "with",
  "please", "tell", "about",
]);

function contentTokens(tokens: string[]): Set<string> {
  return new Set(tokens.filter((t) => !STOPWORDS.has(t)));
}

/**
 * Coverage of the curated phrase's CONTENT words by the question — not symmetric
 * similarity, because a long question that fully contains a short curated phrase
 * is a strong match.
 *
 * Returns 0 when the phrase has fewer than two content words: a single content
 * word is too thin to justify serving a verbatim human-approved answer, and the
 * exact-containment path already covers the case where the citizen typed the
 * phrase itself.
 */
const MIN_CONTENT_TOKENS = 2;

function overlap(question: Set<string>, phrase: Set<string>): number {
  if (question.size === 0) return 0;
  if (phrase.size < MIN_CONTENT_TOKENS) return 0;

  let inter = 0;
  for (const t of phrase) if (question.has(t)) inter += 1;
  return inter / phrase.size;
}

/** Trailing punctuation and greeting filler, so "hello!" and "hi there" match. */
function stripConversational(s: string): string {
  return s
    .replace(/[?!.,;:៕។\s]+$/g, "")
    .replace(/^(um+|uh+|ok|okay|so|hey)\s+/g, "")
    .replace(/\s+(there|askgov|bot)$/g, "")
    .trim();
}

export function matchCurated(
  question: string,
  lang: Lang,
  threshold: number,
): CuratedMatch | null {
  const { curated } = getKb();
  const qFold = normalizeFold(question);
  const qStripped = stripConversational(qFold);
  const qTokens = new Set(segment(question));

  let best: (CuratedMatch & { specificity: number }) | null = null;

  for (const entry of curated) {
    const mode: MatchMode = entry.matchMode === "whole" ? "whole" : "phrase";

    for (const phrase of entry.match) {
      const pFold = normalizeFold(phrase);
      let score = 0;

      if (mode === "whole") {
        // The whole question, or nothing. No partial credit — a greeting entry
        // must never win against a real question that merely opens politely.
        score = qStripped === stripConversational(pFold) ? 1 : 0;
      } else if (containsWord(qFold, pFold)) {
        score = 1;
      } else {
        score = overlap(qTokens, contentTokens(segment(phrase)));
      }

      if (score < threshold) continue;

      // On equal scores the more specific phrase wins — otherwise the answer
      // served depends on the order entries happen to sit in the JSON file.
      const specificity = pFold.length;
      const better =
        !best ||
        score > best.score ||
        (score === best.score && specificity > best.specificity);

      if (better) {
        best = { id: entry.id, answer: entry.answer[lang], score, specificity };
      }
    }
  }

  if (!best) return null;
  return { id: best.id, answer: best.answer, score: best.score };
}
