/**
 * Romanised Khmer input → Khmer script (FR-03).
 *
 * Citizens on Latin keyboards type "bat robous bek bor" or "sombot kamnert".
 * Without this mapping those queries retrieve nothing, because the index holds
 * Khmer script only.
 *
 * Approach: a maintained phrase-level transliteration table rather than a
 * general grapheme transliterator. Phrase-level is far more accurate for a
 * bounded service vocabulary, and the table is content that ops can extend
 * without touching code. Unmapped input passes through untouched, so the
 * function is always safe to apply.
 */

/** Romanised form → Khmer script. Keys are lowercase, space-normalised. */
const PHRASES: Record<string, string> = {
  // Driving licence
  "bat bek bor": "ប័ណ្ណបើកបរ",
  "bat robous bek bor": "ប័ណ្ណបើកបរ",
  "bang bek bor": "ប័ណ្ណបើកបរ",
  "bat baek bar": "ប័ណ្ណបើកបរ",
  "bek bor": "បើកបរ",

  // Birth certificate / registration
  "sombot kamnert": "សំបុត្រកំណើត",
  "sombot kamnaet": "សំបុត្រកំណើត",
  "sambot kamnert": "សំបុត្រកំណើត",
  "chos banhchi": "ចុះបញ្ជី",
  "chuh banhchi": "ចុះបញ្ជី",
  kamnert: "កំណើត",
  kamnaet: "កំណើត",

  // Identity and family documents
  "atta sanhnhean bat": "អត្តសញ្ញាណប័ណ្ណ",
  "attasanhnhean bat": "អត្តសញ្ញាណប័ណ្ណ",
  "sievphov kruosar": "សៀវភៅគ្រួសារ",
  "sievphou kruosar": "សៀវភៅគ្រួសារ",

  // Fees and payment
  thlai: "ថ្លៃ",
  "thlai sevea": "ថ្លៃសេវា",
  "bong prak": "បង់ប្រាក់",
  "bangkan dai": "បង្កាន់ដៃ",
  prak: "ប្រាក់",

  // Offices
  kariyalay: "ការិយាល័យ",
  khum: "ឃុំ",
  sangkat: "សង្កាត់",
  khet: "ខេត្ត",
  "krosang moha phtey": "ក្រសួងមហាផ្ទៃ",

  // Common verbs and qualifiers
  ekasa: "ឯកសារ",
  ekkasa: "ឯកសារ",
  "trov kar": "ត្រូវការ",
  "trauv kar": "ត្រូវការ",
  yut: "យឺត",
  "yut yav": "យឺតយ៉ាវ",
  ban: "បន្ត",
  bant: "បន្ត",
  sakse: "សាក្សី",
  robthot: "រូបថត",
  "doch mdech": "ដូចម្តេច",
};

/** Longest phrases first so multi-word forms win over their parts. */
const KEYS = Object.keys(PHRASES).sort((a, b) => b.length - a.length);

/**
 * Whole-word match only.
 *
 * Substring matching mis-fires badly here, and did: "prakas" (a legal
 * instrument, and a perfectly ordinary English-sentence word for a citizen to
 * ask about) contains "prak" — the romanisation of ប្រាក់, money. That made
 * "what does prakas mean" look like romanised Khmer, so the language detector
 * chose Khmer and answered an English question in Khmer.
 *
 * Romanised Khmer is written with spaces between syllable groups, so word
 * boundaries are exactly the right test.
 */
function wordRegex(key: string): RegExp {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
}

const KEY_PATTERNS = new Map(KEYS.map((k) => [k, wordRegex(k)]));

/** True when the input is Latin-script but looks like romanised Khmer. */
export function looksRomanised(input: string): boolean {
  const s = input.toLowerCase();
  if (/[ក-៿]/.test(s)) return false;
  return KEYS.some((k) => KEY_PATTERNS.get(k)!.test(s));
}

/**
 * Replace every recognised romanised phrase with its Khmer form, leaving all
 * other text intact. Returns the original string when nothing matches.
 */
export function romanizeToKhmer(input: string): string {
  let s = input.toLowerCase().replace(/\s+/g, " ");
  let changed = false;

  for (const key of KEYS) {
    // Global word-boundary replace. The capture groups preserve the surrounding
    // characters, which a plain split/join would eat.
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const global = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "gi");
    if (!global.test(s)) continue;
    global.lastIndex = 0;
    s = s.replace(global, `$1${PHRASES[key]}$2`);
    changed = true;
  }

  return changed ? s.trim() : input;
}
