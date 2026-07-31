/**
 * Risk classification of a detected change (section 10.5).
 *
 * Section 10.5 splits published changes two ways: fees, deadlines, required
 * documents, eligibility and procedure steps require steward approval, while
 * presentation-only changes such as formatting "may be automated".
 *
 * This classifier decides which bucket a change falls in, and it is used to
 * ROUTE and PRIORITISE — not to publish. Nothing in this build auto-publishes,
 * whatever this returns, because the classifier is a keyword scan and a keyword
 * scan cannot see a fee that moved into an image, a deadline reworded from "30
 * days" to "one month", or a requirement deleted rather than added. Treating a
 * `presentation` verdict as permission to skip a human would be trusting it
 * with a decision it is not good enough to make.
 *
 * Its real value is the opposite direction: a `factual` verdict is a reliable
 * "look at this first" signal for a steward with a full queue, because the
 * scan over-reports rather than under-reports.
 */

import type { ChangeRisk } from "./types";

/**
 * Terms that mark text as factual service content, in both languages.
 *
 * Khmer terms are matched against normalised text (FR-04), same as the index.
 */
const FACTUAL_TERMS: Array<{ term: RegExp; label: string }> = [
  // Money
  { term: /\b(fee|fees|charge|charges|cost|price|payment|riel|USD|KHR)\b/i, label: "fee" },
  { term: /(ថ្លៃ|ថ្លៃសេវា|ប្រាក់|រៀល|ដុល្លារ|បង់ប្រាក់)/, label: "fee-km" },
  { term: /(៛|\$)\s?\d/, label: "currency-figure" },

  // Time limits
  { term: /\b(deadline|within \d+|expiry|expires?|valid(ity)? (for|until)|renew(al)? period)\b/i, label: "deadline" },
  { term: /(កំណត់ពេល|ថ្ងៃផុតកំណត់|អាយុកាល|ក្នុងរយៈពេល|បន្តអាយុកាល)/, label: "deadline-km" },
  { term: /\b\d+\s?(day|days|week|weeks|month|months|year|years|working day)\b/i, label: "duration" },

  // Required documents
  { term: /\b(document|documents|required|requirement|must (submit|provide|bring)|attach|certified copy|photocopy)\b/i, label: "documents" },
  { term: /(ឯកសារ|តម្រូវ|ត្រូវការ|ត្រូវដាក់|ច្បាប់ចម្លង|រូបថត)/, label: "documents-km" },

  // Eligibility
  { term: /\b(eligib|qualif|entitled|age (limit|of)|condition|criteria)\b/i, label: "eligibility" },
  { term: /(លក្ខខណ្ឌ|សិទ្ធិទទួល|អាយុ)/, label: "eligibility-km" },

  // Procedure
  { term: /\b(procedure|process|step \d|how to apply|application form|submit)\b/i, label: "procedure" },
  { term: /(នីតិវិធី|ជំហាន|ពាក្យសុំ|របៀបស្នើសុំ)/, label: "procedure-km" },

  // The instruments themselves — a new prakas is always worth a steward's eye
  { term: /\b(prakas|sub-?decree|anukret|royal decree|circular|law on)\b/i, label: "instrument" },
  { term: /(ប្រកាស|អនុក្រឹត្យ|ព្រះរាជក្រឹត្យ|សារាចរ|ច្បាប់ស្តីពី)/, label: "instrument-km" },
];

export interface Classification {
  risk: ChangeRisk;
  terms: string[];
}

/**
 * Classify the text that CHANGED, not the whole page.
 *
 * Classifying the whole page would mark every change on a service page as
 * factual, because the page mentions a fee somewhere regardless of what
 * actually moved — and a queue where everything is top priority has no
 * priorities at all.
 */
export function classify(changedText: string): Classification {
  const terms = new Set<string>();

  for (const { term, label } of FACTUAL_TERMS) {
    if (term.test(changedText)) terms.add(label);
  }

  return {
    risk: terms.size > 0 ? "factual" : "presentation",
    terms: [...terms],
  };
}

/**
 * The lines present in `next` but not in `prev`, plus those removed.
 *
 * A line-set difference rather than a real diff: order changes on government
 * CMS pages are usually a reordered news list, which is not a content change
 * worth a steward's attention, and a set difference ignores them for free.
 */
export function changedLines(prev: string, next: string): string {
  const before = new Set(prev.split("\n").map((l) => l.trim()).filter(Boolean));
  const after = new Set(next.split("\n").map((l) => l.trim()).filter(Boolean));

  const added = [...after].filter((l) => !before.has(l));
  const removed = [...before].filter((l) => !after.has(l));

  return [...added, ...removed].join("\n");
}
