/**
 * Does the retrieved source actually address the question? (R-07)
 *
 * ── THE FAILURE THIS EXISTS TO STOP ────────────────────────────────────────
 * Retrieval scores similarity. Similarity is not aboutness, and the gap between
 * them produced every bad answer this build has shipped:
 *
 *   "how do i register a new company"      → birth registration, cited
 *   "how do i get a passport"              → the family book, cited
 *   "tell me about Baby Outlet's trademark
 *    and company registry"                 → the definition of a trademark, cited
 *
 * Each cleared RETRIEVAL_MIN_SCORE on one shared word — "register", "trademark"
 * — while the source had nothing to say about what was asked. The confidence
 * gate cannot catch these because the score genuinely is high; the source is
 * genuinely about trademarks. It is simply not about *Baby Outlet's* trademark.
 *
 * §13 calls a fluent answer over irrelevant sources worse than no service, and
 * these are exactly that: authoritative-looking, citation-attached, wrong.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * The test is coverage rather than similarity: of the content words the citizen
 * used, how many appear in the source at all? A source that answers a question
 * generally contains the things the question was about. One that shares a topic
 * word and nothing else does not.
 *
 * This deliberately does NOT suppress the answer. A suppressed answer is the
 * dead end that makes a correct system feel useless. It downgrades: the answer
 * is offered as the closest thing found, plainly labelled as possibly not
 * addressing the question, with its source attached so the citizen can judge.
 */

import { segment } from "@/lib/khmer/segment";
import { normalizeFold } from "@/lib/khmer/normalize";

/**
 * Words that carry no aboutness. A question made only of these has nothing to
 * check, so coverage is meaningless and the gate stays out of the way.
 */
const STOPWORDS = new Set([
  "what", "who", "how", "when", "where", "which", "why", "whose",
  "do", "does", "did", "is", "are", "am", "was", "were", "be", "been", "being",
  "can", "could", "will", "would", "should", "shall", "may", "might", "must",
  "i", "you", "me", "my", "mine", "we", "our", "us", "it", "its", "they", "them",
  "this", "that", "these", "those", "the", "a", "an", "and", "or", "but", "if",
  "to", "for", "of", "in", "on", "at", "with", "from", "by", "about", "as",
  "please", "tell", "know", "need", "want", "get", "have", "has", "there",
  "s", "me", "give", "show", "explain", "any", "some", "all", "more",
]);

export interface Topicality {
  /** Fraction of the question's content words present in the source. */
  coverage: number;
  /** Question terms the source never mentions — the reason for a downgrade. */
  missing: string[];
  /** Terms the source does cover. */
  covered: string[];
  /** True when the source plausibly addresses the question. */
  onTopic: boolean;
}

/**
 * Floor for treating a source as addressing the question.
 *
 * Deliberately low. The job is catching sources that share one word out of six,
 * not enforcing a tight match — a source can answer a question while using
 * different vocabulary for most of it, and over-refusing is its own failure.
 */
const MIN_COVERAGE = Number(process.env.TOPICALITY_MIN_COVERAGE ?? "0.34");

/** Below this many content words there is nothing meaningful to measure. */
const MIN_TERMS = 3;

function contentTerms(text: string): string[] {
  const folded = normalizeFold(text);
  return segment(folded).filter(
    (t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t),
  );
}

/**
 * A term counts as present if the source contains it as a substring.
 *
 * Substring rather than whole-word on purpose: it is the lenient direction, and
 * this gate should only fire when a source is clearly unrelated. Khmer has no
 * word boundaries anyway, so substring is the only test that works across both
 * scripts.
 */
export function assess(question: string, sourceText: string): Topicality {
  const terms = [...new Set(contentTerms(question))];
  const haystack = normalizeFold(sourceText);

  if (terms.length < MIN_TERMS) {
    return { coverage: 1, missing: [], covered: terms, onTopic: true };
  }

  const covered: string[] = [];
  const missing: string[] = [];
  for (const t of terms) {
    if (haystack.includes(t)) covered.push(t);
    else missing.push(t);
  }

  const coverage = covered.length / terms.length;
  return { coverage, missing, covered, onTopic: coverage >= MIN_COVERAGE };
}

/**
 * Is the citizen asking about a NAMED individual thing rather than the rule?
 *
 * "Baby Outlet's trademark" and "how do I register a trademark" are different
 * questions, and only the second is answerable from published guidance. The
 * first needs a register lookup, which §6.2 puts outside this platform — but
 * "cannot help" is the wrong answer when the registers are public and the
 * citizen simply needs pointing at them.
 *
 * Detected from possessive and reference phrasing rather than capitalisation,
 * because citizens type in lower case: "what is baby outlet trademark" carries
 * no capital letters at all.
 */
const RECORD_NOUN =
  /\b(trademark|trade mark|mark|brand|patent|company|business|enterprise|firm|shop|store|registry|register|registration|licen[cs]e|permit|certificate|status|owner|ownership)\b/i;

const ENTITY_PHRASING: RegExp[] = [
  // "X's trademark", "X' registration"
  /\b[a-z0-9][\w.\- ]{1,40}['’]s\s+\w*\s*(trademark|mark|brand|company|business|registry|register|registration|licen[cs]e|patent)\b/i,
  // "tell me about X", "information on X", "look up X"
  /\b(tell me about|information (on|about)|look ?up|search for|details (on|about)|check)\b/i,
  // "is X registered", "who owns X"
  /\b(is|are)\s+[\w.\- ]{2,40}\s+(registered|trademarked|licensed)\b/i,
  /\bwho owns\b/i,
];

export function looksLikeEntityLookup(question: string): boolean {
  if (!RECORD_NOUN.test(question)) return false;
  return ENTITY_PHRASING.some((p) => p.test(question));
}
