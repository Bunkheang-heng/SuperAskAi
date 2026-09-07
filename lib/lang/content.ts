/**
 * Content words — the terms in a question that carry what it is ABOUT.
 *
 * Two callers need the same answer to "does this text say anything specific?"
 * and they must not drift apart:
 *
 *   lib/retrieval    decides whether a turn can anchor a follow-up. "Can you
 *                    give me the specific locations?" cannot: strip the
 *                    function words and nothing is left that names a service.
 *   lib/engine/topicality
 *                    decides whether a retrieved source addresses the question,
 *                    by checking how many of these terms it contains.
 *
 * They were separate before, and the disagreement was the whole bug: retrieval
 * treated a seven-word question as substantive because it counted tokens, while
 * topicality counted content words, found two, and disabled itself. A passport
 * follow-up therefore resolved against a subject-less turn AND skipped the gate
 * that would have caught the result.
 */

import { segment } from "@/lib/khmer/segment";
import { normalizeFold } from "@/lib/khmer/normalize";
import { normaliseWord } from "@/lib/lang/stem";

/**
 * Words that carry no aboutness. A question made only of these has nothing to
 * check, so coverage is meaningless and the topicality gate stays out of the
 * way.
 */
export const STOPWORDS = new Set([
  "what", "who", "how", "when", "where", "which", "why", "whose",
  "do", "does", "did", "is", "are", "am", "was", "were", "be", "been", "being",
  "can", "could", "will", "would", "should", "shall", "may", "might", "must",
  "i", "you", "me", "my", "mine", "we", "our", "us", "it", "its", "they", "them",
  "this", "that", "these", "those", "the", "a", "an", "and", "or", "but", "if",
  "to", "for", "of", "in", "on", "at", "with", "from", "by", "about", "as",
  "please", "tell", "know", "need", "want", "get", "have", "has", "there",
  "s", "me", "give", "show", "explain", "any", "some", "all", "more",
  // Deictic words a citizen uses INSTEAD of naming the thing. They read as
  // content words but point at the previous turn rather than at a service, so
  // counting them makes a subject-less follow-up look substantive.
  "specific", "exact", "exactly", "again", "instead", "one", "ones", "thing",
  "things", "place", "places", "location", "locations", "detail", "details",
  "info", "information",
]);

/**
 * The stoplist as `segment()` will actually produce it.
 *
 * `segment()` suffix-strips Latin tokens, so the authored list above — written
 * in ordinary English for a human to maintain — no longer matches it directly:
 * "give" arrives as "giv" and "locations" as "locat". Comparing the raw list
 * against stemmed tokens silently lets every inflected stopword through, which
 * makes a subject-less follow-up look substantive and re-opens the FR-07 bug in
 * this file's header. Stem both sides, once, here.
 */
const STOPWORD_STEMS = new Set([...STOPWORDS].map((w) => normaliseWord(w)));

/** Distinct content words in a text, normalised and segmented. */
export function contentTerms(text: string): string[] {
  const folded = normalizeFold(text);
  return segment(folded).filter(
    (t) => t.length > 1 && !STOPWORD_STEMS.has(t) && !/^\d+$/.test(t),
  );
}

/**
 * Below this many content words, a text does not say what it is about.
 *
 * Used in both directions: a turn with fewer cannot anchor a follow-up, and a
 * question with fewer gives the topicality gate nothing to measure.
 */
export const MIN_TERMS = 3;

/** True when a text carries no subject of its own — "where in phnom penh?" */
export function isSubjectless(text: string): boolean {
  return new Set(contentTerms(text)).size < MIN_TERMS;
}
