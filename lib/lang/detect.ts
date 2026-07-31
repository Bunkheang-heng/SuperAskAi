/**
 * Language detection (FR-08). The system replies in the language the citizen
 * used, so this decides both the generation instruction and the UI copy for
 * disclaimers and escalation.
 *
 * Rule: any meaningful amount of Khmer script means Khmer. A citizen who mixes
 * an English loanword into a Khmer sentence wants a Khmer answer; the reverse
 * is not true, so the threshold is deliberately low rather than a majority.
 */

import type { Lang } from "@/lib/types";
import { looksRomanised } from "@/lib/khmer/romanize";

export function detectLang(input: string): Lang {
  const khmerChars = (input.match(/[ក-៿]/g) ?? []).length;
  if (khmerChars >= 2) return "km";

  // Romanised Khmer is a Khmer speaker on a Latin keyboard. FR-03 normalises
  // the query to Khmer script; the answer should follow the script the citizen
  // can actually read, which for romanised input is Khmer.
  if (looksRomanised(input)) return "km";

  return "en";
}
