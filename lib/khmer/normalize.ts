/**
 * Khmer text normalisation (FR-04).
 *
 * Two distinct problems, both of which break retrieval silently if unhandled:
 *
 * 1. Unicode equivalence. The same visible word can be encoded several ways.
 *    NFC composition handles the standard cases.
 *
 * 2. Canonical ordering. Khmer stacks a base consonant with a subscript
 *    (COENG + consonant), a vowel sign, and a diacritic. Typists enter these
 *    in whatever order their keyboard produces; the results are visually
 *    identical but byte-different. Without reordering, "ប័ណ្ណ" typed two ways
 *    indexes as two different terms and keyword retrieval misses.
 *
 * The same function MUST be applied at index time and at query time (FR-05).
 * Any divergence between the two is a silent recall failure.
 */

const COENG = "្";

/** Dependent vowel signs, U+17B6..U+17C5. */
const VOWEL = /[ា-ៅ]/;
/** Signs and diacritics, U+17C6..U+17D1 plus U+17DD. */
const DIACRITIC = /[ំ-៑៝]/;
/** Base consonants and independent vowels, U+1780..U+17B5. */
const CONSONANT = /[ក-឵]/;

/** Zero-width and invisible characters that survive copy/paste from PDFs. */
const INVISIBLE = /[​‌‍⁠﻿­]/g;

/**
 * Sort order within one orthographic cluster. Lower sorts first: subscripts
 * precede vowels, which precede diacritics.
 */
function classRank(mark: string): number {
  const ch = mark[0];
  if (ch === COENG) return 1;
  if (VOWEL.test(ch)) return 2;
  if (DIACRITIC.test(ch)) return 3;
  return 0;
}

/** Stable sort of a cluster's dependent marks into canonical order. */
function sortMarks(marks: string[]): string[] {
  return marks
    .map((m, idx) => ({ m, idx, rank: classRank(m) }))
    .sort((a, b) => a.rank - b.rank || a.idx - b.idx)
    .map(({ m }) => m);
}

/**
 * Walk the string one orthographic cluster at a time and canonicalise the
 * dependent marks of each. A COENG binds to the consonant that follows it, so
 * the pair travels together as a single mark.
 */
function reorder(input: string): string {
  const chars = Array.from(input);
  const out: string[] = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (!CONSONANT.test(ch)) {
      out.push(ch);
      i += 1;
      continue;
    }

    out.push(ch);
    i += 1;

    const marks: string[] = [];
    while (i < chars.length) {
      const c = chars[i];
      if (c === COENG && i + 1 < chars.length && CONSONANT.test(chars[i + 1])) {
        marks.push(COENG + chars[i + 1]);
        i += 2;
        continue;
      }
      if (VOWEL.test(c) || DIACRITIC.test(c)) {
        marks.push(c);
        i += 1;
        continue;
      }
      break;
    }

    out.push(...sortMarks(marks));
  }

  return out.join("");
}

/** Khmer digits U+17E0..U+17E9 → ASCII, so numeric matching works uniformly. */
export function khmerDigitsToAscii(input: string): string {
  return input.replace(/[០-៩]/g, (d) => String(d.charCodeAt(0) - 0x17e0));
}

/** The single normalisation entry point. Index time and query time both. */
export function normalize(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFC");
  s = s.replace(INVISIBLE, "");
  s = reorder(s);
  s = s.replace(/[\s　]+/g, " ").trim();
  return s;
}

/** Case-folded normalisation, for lexical matching. */
export function normalizeFold(input: string): string {
  return normalize(input).toLowerCase();
}

export function hasKhmer(input: string): boolean {
  return /[ក-៿]/.test(input);
}

/**
 * Does `phrase` occur in `text` as a whole word?
 *
 * Script-aware because the two scripts need opposite rules, and getting this
 * wrong has been a live bug twice in this codebase:
 *
 *   Latin — raw substring matching is wrong. The curated phrase "hi" matched
 *     "w[hi]ch office holds my file", serving a greeting in place of a
 *     wayfinding answer. The romanisation "prak" (ប្រាក់, money) matched
 *     "[prak]as", making an English question look like romanised Khmer.
 *
 *   Khmer — written without spaces between words, so word boundaries do not
 *     exist in the Latin sense. Substring containment IS the correct test, and
 *     the segmenter is what guards precision.
 *
 * Shared by the curated matcher and the glossary matcher so the two cannot
 * drift apart on a rule this easy to get subtly wrong.
 */
export function containsWord(text: string, phrase: string): boolean {
  if (hasKhmer(phrase)) return text.includes(phrase);

  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}
