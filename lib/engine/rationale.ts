/**
 * "Why is there a late fee?" — questions asking for the REASON behind a rule.
 *
 * ── THE FAILURE THIS EXISTS TO STOP ────────────────────────────────────────
 * A citizen asked why the late penalty on driving licence renewal exists. The
 * corpus holds MPWT-DL-008, which states the penalty, its rate, and when it
 * starts. It does not say why it exists — the published page sets out the rule
 * and gives no rationale for it.
 *
 * Nothing in the pipeline noticed the difference between those two things, so
 * the model answered the question it *could* answer — what the late fee is —
 * and closed with:
 *
 *   "The late fee applies because the regulation provides that a licence
 *    expired for more than 30 days is subject to a daily penalty on renewal."
 *
 * That is the rule restated as its own justification. It has the shape of an
 * explanation and carries none. Worse, every clause in it is genuinely
 * supported by the source, so the FR-15 verification gate passes it without
 * complaint: verification checks that claims are SUPPORTED, not that they are
 * INFORMATIVE, and a tautology is perfectly supported.
 *
 * The citizen then asked "but why though?" and got a byte-identical answer,
 * because nothing about the first turn recorded that the question had not
 * actually been answered.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * So the gap is detected explicitly: the citizen asked for a reason AND no
 * cited source contains one. The answer then says so in those words instead of
 * dressing the rule up as its own cause, and the officer is offered — a policy
 * rationale is exactly the kind of thing a human can explain and a published
 * procedure page cannot.
 *
 * This follows the topicality downgrade rather than the suppression path: the
 * citizen keeps the sourced rule, which is real information they asked around,
 * and is told plainly what the source does not establish. Withholding a correct
 * rule because it does not answer a "why" would be the dead end §13 warns about.
 */

export interface RationaleCheck {
  /** The citizen asked for a reason, not (only) for the rule. */
  asked: boolean;
  /** Some source in the set actually gives a reason. */
  answered: boolean;
}

/**
 * English rationale-seeking phrasing.
 *
 * Bare "why" is included deliberately. It is the word people actually use, and
 * a false positive here is cheap: the notice only ever fires when the sources
 * ALSO turn out to contain no rationale, and in that case telling the citizen
 * the source does not explain is true whether or not they meant it as a "why".
 */
const WHY_EN: RegExp[] = [
  /\bwhy\b/i,
  /\bhow come\b/i,
  /\bfor what reason\b/i,
  /\bwhat(?:'|’)?s? (?:is )?the (?:reason|point|rationale|purpose|justification)\b/i,
  /\b(?:reason|rationale|justification|purpose) (?:for|behind|of having)\b/i,
  /\bwhat(?:'|’)?s? (?:is )?it for\b/i,
];

/** The same question in Khmer (FR-08). */
const WHY_KM =
  /ហេតុអ្វី|ហេតុអី|មូលហេតុ|ដោយសារអ្វី|ព្រោះអ្វី|ម្តេចបានជា|ម្ដេចបានជា|សម្រាប់អ្វី/;

/**
 * Romanised Khmer, for the same reason guardrails.ts carries a romanised
 * service lexicon: citizens type Khmer in Latin characters constantly and
 * nothing upstream transliterates it.
 */
const WHY_ROMAN = /\b(?:het ?a?vei|het ?ei|hetu ?avei|moul ?het)\b/i;

export function seeksRationale(question: string): boolean {
  if (WHY_KM.test(question)) return true;
  if (WHY_ROMAN.test(question)) return true;
  return WHY_EN.some((p) => p.test(question));
}

/**
 * Does this source text give a reason for anything, as opposed to stating a
 * rule?
 *
 * Tested against the English body only, and that is not an oversight. Khmer
 * marks purpose with ដើម្បី, which is ordinary connective tissue in procedural
 * writing — "ដើម្បីប្តូរប័ណ្ណបើកបរ" is "to exchange a driving licence", pure
 * procedure with no rationale in it. Matching on it would report that nearly
 * every Khmer passage explains itself and switch this whole module off. Every
 * chunk carries `text`; `textKm` is the translation of the same provision, so
 * reading only the English loses no rationale that exists.
 *
 * The markers are the ones that signal a *purpose clause* rather than an
 * infinitive of ordinary procedure: "to ensure" and "in order to" introduce a
 * reason, while "to renew" and "for verification purposes only" do not.
 */
const RATIONALE_MARKERS: RegExp[] = [
  /\bin order (?:to|that)\b/i,
  /\bso as to\b/i,
  /\bso that\b/i,
  /\bto ensure\b/i,
  /\bto (?:prevent|deter|discourage|encourage|protect|safeguard)\b/i,
  /\bthe purpose of\b/i,
  /\b(?:is|are|was|were) intended to\b/i,
  /\baims? to\b/i,
  /\bthe reason\b/i,
  /\brationale\b/i,
  /\bbecause\b/i,
  /\bon the grounds that\b/i,
  /\bjustif(?:y|ies|ied|ication)\b/i,
];

export function explainsRationale(text: string): boolean {
  return RATIONALE_MARKERS.some((p) => p.test(text));
}

/**
 * The citizen wants a reason and these sources do not carry one.
 *
 * `sourceTexts` must hold only sources that could actually answer THIS question
 * — in practice the top-ranked one. Passing the whole candidate set defeats the
 * check: retrieval returns eight passages, and any stray purpose clause in a
 * low-ranked, unrelated one ("to protect consumers from excessive interest
 * rates", from a National Bank chunk retrieved behind a driving-licence
 * question) reports the reason as found. See the call site in
 * lib/engine/tiers.ts for why the top source is the right set.
 */
export function rationaleGap(
  question: string,
  sourceTexts: string[],
): boolean {
  if (!seeksRationale(question)) return false;
  return !sourceTexts.some(explainsRationale);
}

