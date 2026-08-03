/**
 * Language detection (FR-08). The system replies in the language the citizen
 * used, so this decides both the generation instruction and the UI copy for
 * disclaimers and escalation.
 *
 * THE RULE IS THE SCRIPT THE CITIZEN TYPED IN.
 *
 *   Khmer script  → Khmer answer. Any meaningful amount of it counts: someone
 *                   who mixes an English loanword into a Khmer sentence wants a
 *                   Khmer answer, so the threshold is deliberately low rather
 *                   than a majority.
 *   Latin script  → English answer. Including romanised Khmer.
 *
 * That second line reverses an earlier decision, so it is worth stating why it
 * changed. This previously returned Khmer for romanised input, on the reasoning
 * that romanised Khmer is a Khmer speaker on a Latin keyboard. The problem is
 * what it does when the guess is wrong: a citizen who typed Latin characters
 * and cannot comfortably read Khmer script receives an answer they cannot use
 * at all, and has no way to ask for it differently. Answering in the script
 * they demonstrably typed in fails softer — a Khmer speaker who wanted Khmer
 * can switch keyboards and ask again, and gets it.
 *
 * FR-03 is unaffected: lib/retrieval still romanises the QUERY to Khmer script
 * before searching, because that is what finds Khmer content in the corpus.
 * Which script we search in and which script we answer in are separate
 * decisions, and only the second one is this function's business.
 */

import type { Lang } from "@/lib/types";

export function detectLang(input: string): Lang {
  const khmerChars = (input.match(/[ក-៿]/g) ?? []).length;
  if (khmerChars >= 2) return "km";

  return "en";
}
