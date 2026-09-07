/**
 * Khmer word segmentation (FR-05).
 *
 * Khmer is written without spaces between words, so keyword retrieval has
 * nothing to tokenise on. Production will use a trained segmenter (or ICU
 * dictionary-based break iteration). This implementation is a deterministic
 * orthographic-cluster segmenter with a maintained lexicon of the terms that
 * matter for government service vocabulary.
 *
 * The contract that matters more than the algorithm: the SAME function runs at
 * index time and at query time. Swapping the implementation is safe as long as
 * both sides swap together.
 */

import { normalizeFold } from "./normalize";
import { normaliseWord } from "@/lib/lang/stem";

const COENG = "្";
const VOWEL = /[ា-ៅ]/;
const DIACRITIC = /[ំ-៑៝]/;
const CONSONANT = /[ក-឵]/;
const KHMER = /[ក-៿]/;

/**
 * Service-domain lexicon. Longest-match-first segmentation uses this before
 * falling back to cluster n-grams. Extend as ministries onboard — this is
 * ordinary content maintenance, not a code change.
 */
const LEXICON = [
  "ប័ណ្ណបើកបរ", // driving licence
  "សំបុត្រកំណើត", // birth certificate
  "អត្តសញ្ញាណប័ណ្ណ", // identity card
  "សៀវភៅគ្រួសារ", // family book
  "ការចុះបញ្ជី", // registration
  "ចុះបញ្ជី", // register
  "រដ្ឋបាលឃុំ", // commune administration
  "ឃុំសង្កាត់", // commune / sangkat
  "ក្រសួងមហាផ្ទៃ", // Ministry of Interior
  "សាធារណការ", // public works
  "ដឹកជញ្ជូន", // transport
  "បន្តអាយុកាល", // renew validity
  "អាយុកាល", // validity period
  "ឯកសារ", // document
  "តម្រូវការ", // requirement
  "កំណត់ពេល", // deadline
  "បង់ប្រាក់", // payment
  "បង្កាន់ដៃ", // receipt
  "ថ្លៃសេវា", // service fee
  "ការិយាល័យ", // office
  "ខេត្ត", // province
  "ប័ណ្ណ", // licence / card
  "កំណើត", // birth
  "សំបុត្រ", // certificate
  "បើកបរ", // drive
  "ត្រូវការ", // need
  "យឺតយ៉ាវ", // late
  "ហួសកំណត់", // overdue
  "សាក្សី", // witness
  "ប្តូរឈ្មោះ", // name change
  "លិខិត", // letter / document
  "រូបថត", // photograph
  "ថ្លៃ", // price
  "ប្រាក់", // money
  "យឺត", // late
  "ណា", // which
  "អ្វី", // what
  "ដូចម្តេច", // how
].sort((a, b) => b.length - a.length);

const LEXICON_FOLDED = LEXICON.map(normalizeFold);

/**
 * Split Khmer text into orthographic clusters. A cluster is a base consonant
 * plus its subscripts, vowel signs, and diacritics — the smallest unit that is
 * safe to break on without corrupting rendering.
 */
export function clusters(input: string): string[] {
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

    let cluster = ch;
    i += 1;

    while (i < chars.length) {
      const c = chars[i];
      if (c === COENG && i + 1 < chars.length && CONSONANT.test(chars[i + 1])) {
        cluster += c + chars[i + 1];
        i += 2;
        continue;
      }
      if (VOWEL.test(c) || DIACRITIC.test(c)) {
        cluster += c;
        i += 1;
        continue;
      }
      break;
    }

    out.push(cluster);
  }

  return out;
}

/** Longest-match-first pass over a run of Khmer text using the lexicon. */
function segmentKhmerRun(run: string): string[] {
  const tokens: string[] = [];
  let rest = run;

  while (rest.length > 0) {
    const hit = LEXICON_FOLDED.find((w) => rest.startsWith(w));
    if (hit) {
      tokens.push(hit);
      rest = rest.slice(hit.length);
      continue;
    }

    // No lexicon match at this position. Emit one cluster and advance, then
    // also emit cluster bigrams so that unlexicalised compounds still match
    // partially rather than not at all.
    const cs = clusters(rest);
    if (cs.length === 0) break;
    tokens.push(cs[0]);
    rest = rest.slice(cs[0].length);
  }

  return tokens;
}

/**
 * Tokenise mixed Khmer / Latin text into comparable units.
 * Latin words are lowercased, split on non-alphanumerics, and suffix-stripped
 * (see lib/lang/stem.ts — without it "registering" never matches "register");
 * Khmer runs go through the segmenter and do not inflect this way, so they are
 * left alone. Khmer cluster bigrams are appended as extra units to lift recall
 * on compounds the lexicon does not yet cover (R-07).
 */
export function segment(input: string): string[] {
  const s = normalizeFold(input);
  const tokens: string[] = [];

  // Split into alternating Khmer / non-Khmer runs.
  const runs = s.split(/([ក-៿]+)/).filter(Boolean);

  for (const run of runs) {
    if (KHMER.test(run)) {
      const words = segmentKhmerRun(run);
      tokens.push(...words);

      const cs = clusters(run);
      for (let i = 0; i + 1 < cs.length; i += 1) {
        tokens.push(cs[i] + cs[i + 1]);
      }
    } else {
      run
        .split(/[^a-z0-9]+/i)
        .filter((w) => w.length > 1)
        .forEach((w) => tokens.push(normaliseWord(w.toLowerCase())));
    }
  }

  return tokens;
}
