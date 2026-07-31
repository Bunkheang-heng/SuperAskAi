/**
 * Plain-language explanation of official terminology (section 6.1).
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The off-domain refusal in tiers.ts tells the citizen, in both languages:
 * "What it can do: explain what an official term in a government document
 * means. For example, 'What does prakas mean?'"
 *
 * That sentence was true as policy and false as behaviour. The corpus holds
 * procedures, not definitions, so "what does prakas mean" scored 0.11 against
 * the retrieval floor of 0.20 and came back as a coverage gap with an offer to
 * escalate — the service advertising a capability and then refusing the exact
 * example it gave. This module is what makes the sentence true.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * A definition is Tier 1 content: human-approved text served verbatim, no
 * generation, no figures, nothing for the FR-15 gate to catch. It cites nothing
 * because it asserts nothing about any specific service — a definition of
 * "prakas" is not a claim about a fee or a deadline. Manufacturing a citation
 * with an instrument number and an article for it would be inventing source
 * metadata, which is the FR-45 failure this build exists to avoid.
 *
 * ── WHERE IT RUNS, AND WHY THAT PLACE ──────────────────────────────────────
 * Not before retrieval, where curated Tier 1 sits. AFTER the FR-16 confidence
 * gate has already decided to refuse.
 *
 * The reason is precision. "Article" and "province" are ordinary English words;
 * "what does the prakas say about the renewal fee" is a procedure question that
 * happens to contain a glossary term. Running the glossary first would let a
 * term match steal a question retrieval could answer properly, and a definition
 * served in place of a procedure is a worse answer than the procedure.
 *
 * Running it last gives a property worth stating plainly: the glossary can only
 * ever convert a refusal into an answer. It cannot displace a retrieved one. A
 * false positive costs a definition where the citizen would otherwise have got
 * "AskGov has no source for this" — which is not a good outcome, but it is not
 * a harmful one, and it is strictly better than the refusal it replaced.
 */

import type { Lang } from "@/lib/types";
import { normalizeFold, containsWord } from "@/lib/khmer/normalize";
import { getKb } from "@/lib/kb/loader";

export interface GlossaryMatch {
  id: string;
  /** The term as titled in the citizen's language, for the trace panel. */
  term: string;
  definition: string;
}

/**
 * Is the citizen asking what something MEANS, as opposed to how to do it?
 *
 * Both halves are required — intent and a known term. Intent alone is most of
 * the questions this service receives ("what is the fee", "what documents do I
 * need"); a term alone appears in ordinary procedure questions. Only together
 * do they identify a definition request.
 *
 * "How do I ..." is deliberately absent. That is a procedure question even when
 * it contains a term, and it belongs to retrieval.
 */
const DEFINITIONAL: RegExp[] = [
  /\bmean(s|ing)?\b/i,
  /\bdefin(e|ition)\b/i,
  /\bstands? for\b/i,
  /\bwhat('s| is| are)\b/i,
  /\bwhat does\b/i,
  /\bexplain\b/i,
  /\bdifference between\b/i,
  // Khmer: "has the meaning", "what is", "explain", "stands for".
  /(មានន័យ|ន័យ|ជាអ្វី|ពន្យល់|តំណាងឱ្យ|ខុសគ្នា)/,
];

function isDefinitional(question: string): boolean {
  return DEFINITIONAL.some((p) => p.test(question));
}

/**
 * The definition of the longest term the question mentions, or null.
 *
 * Longest wins so "joint prakas" beats "prakas" and "sub-decree" beats a bare
 * hyphen split — otherwise the answer served would depend on the order entries
 * happen to sit in the JSON file, which is the same bug the curated matcher's
 * specificity tie-break exists to prevent.
 */
export function matchGlossary(question: string, lang: Lang): GlossaryMatch | null {
  if (!isDefinitional(question)) return null;

  const q = normalizeFold(question);
  let best: (GlossaryMatch & { length: number }) | null = null;

  for (const entry of getKb().glossary) {
    for (const alias of entry.match) {
      const a = normalizeFold(alias);
      if (!containsWord(q, a)) continue;
      if (best && a.length <= best.length) continue;

      best = {
        id: entry.id,
        term: entry.term[lang],
        definition: entry.definition[lang],
        length: a.length,
      };
    }
  }

  if (!best) return null;
  return { id: best.id, term: best.term, definition: best.definition };
}
