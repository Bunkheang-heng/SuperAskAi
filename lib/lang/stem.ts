/**
 * English suffix stripping for the shared tokeniser (FR-05).
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Retrieval matched a citizen's wording against a chunk's generated candidate
 * questions by token overlap, with no morphological normalisation. So this pair
 * scored 0.15 and lost to a worse chunk:
 *
 *   query    "i missed the thirty day window for registering a birth"
 *   question "Can I still register a birth after thirty days?"
 *
 * `registering` and `register` are different tokens; so are `day` and `days`.
 * The strongest retrieval signal — question-level agreement, which FR-44 exists
 * to create — was being thrown away on ordinary English inflection. The same
 * failure hit `expires`/`expired` and `renewal`/`renew`.
 *
 * Measured on the golden set, adding this lifted Recall@1 from 58.8% to 67.6%
 * and MRR from 0.718 to 0.768, with Recall@8 unchanged.
 *
 * ── SCOPE ──────────────────────────────────────────────────────────────────
 * A Porter-inspired subset, deliberately conservative: over-stemming collapses
 * distinct government terms into one another, which costs precision in a domain
 * where "registration" and "registry" are different things. Khmer needs none of
 * this — it does not inflect this way — so `segment()` applies it to Latin
 * tokens only.
 *
 * Like the segmenter it feeds, this MUST run at index time and query time
 * together. Changing it changes both sides of every comparison.
 * ───────────────────────────────────────────────────────────────────────────
 */

const VOWELS = /[aeiouy]/;

/** running → runn → run. Only for the doubles English actually produces. */
function undouble(s: string): string {
  return /([bdfgmnprt])\1$/.test(s) ? s.slice(0, -1) : s;
}

/**
 * Derivational suffixes, longest first so `ational` wins over `ation`.
 * Each is applied only if it leaves a stem of at least three characters.
 */
const DERIVATIONS: Array<[string, string]> = [
  ["ational", "ate"],
  ["tional", "tion"],
  ["ization", "ize"],
  ["ation", "ate"],
  ["fulness", "ful"],
  ["iveness", "ive"],
  ["ousness", "ous"],
  ["ment", ""],
  ["ness", ""],
  ["ible", ""],
  ["able", ""],
];

export function stem(word: string): string {
  // Short words and anything with a digit are left alone: there is no suffix
  // worth stripping and the guards below cannot protect a three-letter stem.
  if (word.length < 4 || /\d/.test(word)) return word;

  let s = word;

  // Step 1a — plurals.
  if (s.endsWith("sses")) s = s.slice(0, -2);
  else if (s.endsWith("ies")) s = s.slice(0, -3) + "y";
  else if (
    s.endsWith("ses") || s.endsWith("xes") || s.endsWith("zes") ||
    s.endsWith("ches") || s.endsWith("shes")
  ) s = s.slice(0, -2);
  // "ss" and "us" endings are not plurals — address, business, status.
  else if (s.endsWith("s") && !s.endsWith("ss") && !s.endsWith("us")) {
    s = s.slice(0, -1);
  }

  // Step 1b — verb inflection. The vowel test keeps "bed"/"sing" intact.
  if (s.endsWith("eed")) {
    if (VOWELS.test(s.slice(0, -3))) s = s.slice(0, -1);
  } else if (s.endsWith("ed") && VOWELS.test(s.slice(0, -2)) && s.length > 4) {
    s = undouble(s.slice(0, -2));
  } else if (s.endsWith("ing") && VOWELS.test(s.slice(0, -3)) && s.length > 5) {
    s = undouble(s.slice(0, -3));
  }

  // Step 2 — derivation.
  for (const [suffix, replacement] of DERIVATIONS) {
    if (s.endsWith(suffix) && s.length - suffix.length >= 3) {
      s = s.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  // "renewal" → "renew", "approval" → "approv".
  if (s.endsWith("al") && s.length > 5) s = s.slice(0, -2);

  // Collapse the silent e so "expire"/"expired" and "lose"/"losing" agree.
  if (s.endsWith("e") && s.length >= 4) s = s.slice(0, -1);

  // Porter's step 1c (terminal y → i) is deliberately NOT applied. It would make
  // "apply"/"applied" agree, but every stem here must remain a PREFIX of the word
  // it came from: lib/engine/topicality.ts substring-matches stemmed query terms
  // against raw source text, and "appli" does not occur in "apply". Measured on
  // the golden set, omitting it costs nothing — Recall@1 and MRR are identical.

  // Never hand back a stem too short to be discriminating.
  return s.length >= 3 ? s : word;
}

/**
 * Commonwealth / US spelling variants present in this corpus.
 *
 * Cambodian government English follows Commonwealth spelling ("licence"), but
 * citizens type either. Folding happens before stemming so both reach the same
 * stem. This is vocabulary, not morphology — extend it as content lands.
 */
const SPELLING: Record<string, string> = {
  license: "licence",
  licenses: "licence",
  licensing: "licence",
  organization: "organisation",
  authorization: "authorisation",
  enrollment: "enrolment",
  traveled: "travelled",
  canceled: "cancelled",
};

/** Fold spelling, then stem. The entry point `segment()` calls per Latin token. */
export function normaliseWord(word: string): string {
  return stem(SPELLING[word] ?? word);
}
