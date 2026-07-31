/**
 * Verification gate (FR-15, NFR-01).
 *
 * Every generated answer is checked against the sources it claims to rest on,
 * and answers that fail are suppressed rather than delivered. This is the
 * control that makes M-02 (zero uncited factual claims) enforceable rather than
 * aspirational, and it is the primary mitigation for R-02 — an incorrect answer
 * causing citizen harm.
 *
 * It checks three things, in order of how much harm the failure causes:
 *
 * 1. Citation validity. A cited id that was never retrieved means the model
 *    invented a source. That is an immediate hard fail: the citation is the
 *    thing the citizen is being asked to trust.
 *
 * 2. Numeric claims. Fees, deadlines, day counts, and quantities are where an
 *    error does real damage — a citizen who travels with the wrong document
 *    count loses a day, and one who pays the wrong fee is exposed to
 *    overpayment (problem statement 2.2.3, R-06). Every number in the answer
 *    must appear in a cited source.
 *
 * 3. Spelled-out quantities. "Thirty days" carries the same weight as "30
 *    days" and is checked the same way, because a model paraphrasing a source
 *    will often switch between the two forms.
 *
 * What it deliberately does NOT do is judge whether the answer is a *good*
 * answer. That is what the golden question set and human grading are for
 * (M-01, D-05). This gate catches unsupported specifics, which is a narrower
 * and far more reliable thing to automate.
 */

import { normalizeFold, khmerDigitsToAscii } from "@/lib/khmer/normalize";

export interface VerificationResult {
  passed: boolean;
  /** Claims present in the answer but absent from the cited sources. */
  unsupported: string[];
  /** Citation ids the model produced that were never retrieved. */
  invalidCitations: string[];
}

/**
 * Number words that carry procedural weight when they quantify something,
 * mapped to their digit equivalent.
 *
 * The mapping is used in BOTH directions, which matters more than it looks: a
 * model paraphrasing "within thirty days" as "within 30 days" is faithful, and a
 * gate that only checked one direction would suppress a correct answer. A gate
 * that blocks good answers gets switched off, and then it protects nothing.
 */
const NUMBER_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  fifteen: "15",
  twenty: "20",
  thirty: "30",
  sixty: "60",
  ninety: "90",
  hundred: "100",
  មួយ: "1",
  ពីរ: "2",
  បី: "3",
  បួន: "4",
  ប្រាំ: "5",
  ដប់: "10",
  ដប់ប្រាំ: "15",
  ម្ភៃ: "20",
  សាមសិប: "30",
  ហុកសិប: "60",
  កៅសិប: "90",
  រយ: "100",
};

/** Digit → every word form that means it, for the reverse check. */
const DIGIT_TO_WORDS = Object.entries(NUMBER_WORDS).reduce<
  Record<string, string[]>
>((acc, [word, digit]) => {
  (acc[digit] ??= []).push(word);
  return acc;
}, {});

/**
 * Strip formatting artefacts that produce digits the source will never contain:
 * ordered-list markers, and the chunk ids the answer may legitimately mention.
 */
function stripNonClaims(answer: string): string {
  return answer
    // Ordered list markers at the start of a line: "1." / "2)" / "3 -"
    .replace(/^\s*\d+\s*[.)\-]\s*/gm, "")
    // Chunk ids such as MPWT-DL-001 — validated separately, not a claim.
    .replace(/\b[A-Z]{2,6}-[A-Z]{2,6}-\d{3}\b/g, "")
    // Emergency numbers come from the facility directory, not a document chunk.
    .replace(/\b11[789]\b/g, "");
}

/** Digit-run claims: fees, counts, day counts, years. */
function extractNumericClaims(answer: string): string[] {
  const cleaned = khmerDigitsToAscii(stripNonClaims(answer));
  const matches = cleaned.match(/\d[\d,.\s]*\d|\d/g) ?? [];

  return [
    ...new Set(
      matches
        .map((m) => m.replace(/[,\s]/g, "").replace(/\.$/, ""))
        .filter((m) => m.length > 0),
    ),
  ];
}

/** Spelled-out quantities that immediately precede a unit noun. */
function extractWordClaims(answer: string): string[] {
  const fold = normalizeFold(answer);
  const found: string[] = [];

  for (const word of Object.keys(NUMBER_WORDS)) {
    const w = normalizeFold(word);
    if (!fold.includes(w)) continue;

    // Only count it as a claim when it quantifies something procedural.
    const quantifies = new RegExp(
      `${w}\\s*(day|days|month|months|year|years|copy|copies|photograph|photographs|witness|witnesses|riel|dollar|usd|ថ្ងៃ|ខែ|ឆ្នាំ|សន្លឹក|សាក្សី|រៀល)`,
      "i",
    );
    if (quantifies.test(fold)) found.push(word);
  }

  return [...new Set(found)];
}

export function verify(
  answer: string,
  citedIds: string[],
  citedSources: Array<{ id: string; text: string }>,
  retrievedIds: string[],
): VerificationResult {
  // 1. Citation validity.
  const retrieved = new Set(retrievedIds);
  const invalidCitations = citedIds.filter((id) => !retrieved.has(id));

  // The corpus the answer is allowed to rest on.
  const corpus = khmerDigitsToAscii(
    normalizeFold(citedSources.map((s) => s.text).join("\n")),
  );
  const corpusDigits = corpus.replace(/[,\s]/g, "");

  const unsupported: string[] = [];

  // 2. Numeric claims. A digit run is supported if the source contains those
  //    digits, OR contains a word that means the same number ("thirty" ⇒ 30).
  for (const claim of extractNumericClaims(answer)) {
    const wordForms = DIGIT_TO_WORDS[claim] ?? [];
    const supported =
      corpusDigits.includes(claim) ||
      wordForms.some((w) => corpus.includes(normalizeFold(w)));
    if (!supported) unsupported.push(claim);
  }

  // 3. Spelled-out quantities. Symmetric: the word is supported if the source
  //    contains the word, OR the equivalent digits ("30 days" ⇒ thirty).
  for (const claim of extractWordClaims(answer)) {
    const w = normalizeFold(claim);
    const digits = NUMBER_WORDS[claim];
    const supported =
      corpus.includes(w) || (digits ? corpusDigits.includes(digits) : false);
    if (!supported) unsupported.push(claim);
  }

  return {
    passed: invalidCitations.length === 0 && unsupported.length === 0,
    unsupported,
    invalidCitations,
  };
}
