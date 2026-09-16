/**
 * Guardrails and refusal policy (PRD section 12, section 6.2).
 *
 * ── GOVERNANCE NOTE ────────────────────────────────────────────────────────
 * The refusal policy is a governance document approved at DGC leadership level,
 * not a setting configured at engineering discretion (section 12 preamble,
 * OD-07 pending). The patterns below are the machine-readable expression of
 * that policy. Changing what AskGov refuses is a governance change that happens
 * here, deliberately, in one file, and should be reviewed as policy.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Refusal precision is a measured metric: at least 98% of out-of-scope
 * questions must be refused correctly (M-04, NFR-02). Recall on refusal matters
 * more than elegance, so these are broad keyword nets applied before retrieval
 * — a false refusal costs the citizen an escalation to a human, while a false
 * acceptance costs the government an answer it had no authority to give.
 */

import type { Lang } from "@/lib/types";
import { normalizeFold, containsWord } from "@/lib/khmer/normalize";
import { getKb } from "@/lib/kb/loader";
import { isSubjectless } from "@/lib/lang/content";

export type GuardrailKind =
  | "emergency"
  | "personal_case"
  | "legal_advice"
  | "prediction"
  | "land_dispute"
  | "tax_computation"
  | "political"
  | "complaint_routing";

export interface GuardrailHit {
  kind: GuardrailKind;
  /** Emergency terminates the interaction (rule 6). */
  terminal: boolean;
  message: Record<Lang, string>;
}

interface Rule {
  kind: GuardrailKind;
  terminal: boolean;
  patterns: RegExp[];
  message: Record<Lang, string>;
}

const RULES: Rule[] = [
  {
    // Rule 6. Checked first: an emergency framed as a procedural question is
    // still an emergency.
    kind: "emergency",
    terminal: true,
    patterns: [
      /\b(emergency|ambulance|dying|bleeding|unconscious|heart attack|stroke|overdose|suicide|kill (myself|him|her)|being attacked|assault(ed)?|rape|fire|drowning|accident right now)\b/i,
      /\b(help me now|urgent help|call the police)\b/i,
      /(អាសន្ន|សង្គ្រោះបន្ទាន់|រថយន្តសង្គ្រោះ|កំពុងស្លាប់|អគ្គិភ័យ|ចង់សម្លាប់ខ្លួន)/,
    ],
    message: {
      en: "This sounds like an emergency. Contact emergency services immediately:\n\nPolice 117 · Ambulance 119 · Fire 118\n\nAskGov cannot help with emergencies and is ending this conversation here.",
      km: "នេះហាក់ដូចជាស្ថានភាពអាសន្ន។ សូមទាក់ទងសេវាសង្គ្រោះបន្ទាន់ជាបន្ទាន់៖\n\nនគរបាល ១១៧ · សង្គ្រោះបន្ទាន់ ១១៩ · អគ្គិភ័យ ១១៨\n\nAskGov មិនអាចជួយក្នុងករណីអាសន្នបានទេ ហើយបញ្ចប់ការសន្ទនានៅទីនេះ។",
    },
  },
  {
    // Section 6.2: individual case status and personal data lookup. Requires
    // authenticated identity, deferred to Phase 3.
    kind: "personal_case",
    terminal: false,
    patterns: [
      /\b(my|our) (application|case|file|request|submission) (status|progress)\b/i,
      /\b(where is|check|track|status of) my (application|case|file|licence|license|passport|certificate|id)\b/i,
      /\bhas my .* been (approved|processed|issued|rejected)\b/i,
      /\b(look ?up|find|retrieve) my (record|records|details|information|data)\b/i,
      /\bwhat is my (id|licence|license) number\b/i,
      /(ស្ថានភាពពាក្យសុំ|ពាក្យសុំរបស់ខ្ញុំ|ឯកសាររបស់ខ្ញុំ|ត្រួតពិនិត្យករណីរបស់ខ្ញុំ)/,
    ],
    message: {
      en: "AskGov cannot look up an individual case or personal record. It has no access to personal data and no way to verify who you are.\n\nAn officer can check this for you, or you can ask at the office holding your file.",
      km: "AskGov មិនអាចស្វែងរកករណីបុគ្គល ឬកំណត់ត្រាផ្ទាល់ខ្លួនបានទេ។ វាមិនមានសិទ្ធិចូលដល់ទិន្នន័យផ្ទាល់ខ្លួន ហើយមិនអាចផ្ទៀងផ្ទាត់អត្តសញ្ញាណអ្នកបានទេ។\n\nមន្ត្រីអាចពិនិត្យជំនួសអ្នក ឬអ្នកអាចសួរនៅការិយាល័យដែលកាន់កាប់ឯកសាររបស់អ្នក។",
    },
  },
  {
    // Section 6.2 and rule 5: procedure only.
    kind: "legal_advice",
    terminal: false,
    patterns: [
      /\b(is it legal|am i allowed|do i have (the )?right|can i sue|should i sue|legal advice|what does the law say about my|is this lawful|will i be (fined|punished|prosecuted|arrested))\b/i,
      /\b(what are my legal options|do i need a lawyer|can they (arrest|fine|prosecute) me)\b/i,
      /(ស្របច្បាប់ឬទេ|ខ្ញុំមានសិទ្ធិ|ប្រឹក្សាច្បាប់|អាចប្តឹងបានទេ)/,
    ],
    message: {
      en: "AskGov explains procedures, not legal position. It cannot tell you whether something is lawful in your situation or what the consequences would be.\n\nFor that you need a qualified legal professional. An officer can point you to the responsible authority for your case.",
      km: "AskGov ពន្យល់អំពីនីតិវិធី មិនមែនស្ថានភាពផ្នែកច្បាប់ទេ។ វាមិនអាចប្រាប់អ្នកថាតើអ្វីមួយស្របច្បាប់ក្នុងស្ថានភាពរបស់អ្នក ឬផលវិបាកជាអ្វីនោះទេ។\n\nសម្រាប់ករណីនោះ អ្នកត្រូវការជំនាញការផ្នែកច្បាប់។ មន្ត្រីអាចណែនាំអ្នកទៅអាជ្ញាធរទទួលបន្ទុក។",
    },
  },
  {
    // Section 6.2: prediction of official decisions is outside the platform's
    // authority.
    kind: "prediction",
    terminal: false,
    patterns: [
      /\b(will (they|the officer|the office|it) (approve|reject|accept|refuse|allow))\b/i,
      /\b(what are my chances|do you think (they|it) will|am i likely to get)\b/i,
      /\b(how long will (it|they) really take)\b/i,
      /(តើគេនឹងអនុម័តទេ|តើគេនឹងបដិសេធទេ|លទ្ធភាពរបស់ខ្ញុំ)/,
    ],
    message: {
      en: "AskGov cannot predict what an official will decide. That decision belongs to the responsible office, and no answer here would be binding on it.\n\nAskGov can tell you what the published procedure and requirements are, so you can submit a complete file.",
      km: "AskGov មិនអាចទាយថាមន្ត្រីនឹងសម្រេចយ៉ាងណាបានទេ។ ការសម្រេចនោះជាសិទ្ធិរបស់ការិយាល័យទទួលបន្ទុក ហើយចម្លើយនៅទីនេះមិនចងកាតព្វកិច្ចលើវាទេ។\n\nAskGov អាចប្រាប់អ្នកអំពីនីតិវិធី និងលក្ខខណ្ឌដែលបានផ្សាយ ដើម្បីឱ្យអ្នកដាក់ឯកសារពេញលេញ។",
    },
  },
  {
    // Section 6.2: high sensitivity, contested facts.
    kind: "land_dispute",
    terminal: false,
    patterns: [
      /\b(land (dispute|conflict|grab|title dispute)|boundary dispute|who owns (this|the) land|neighbour.{0,20}(land|fence|boundary))\b/i,
      /(ជម្លោះដីធ្លី|ដីធ្លីជម្លោះ|ព្រំដីជម្លោះ)/,
    ],
    message: {
      en: "AskGov does not handle land disputes. These turn on contested facts and are decided by the competent authority, not by an information service.\n\nAn officer can direct you to the responsible authority.",
      km: "AskGov មិនដោះស្រាយជម្លោះដីធ្លីទេ។ ករណីទាំងនេះពាក់ព័ន្ធអង្គហេតុដែលមានការប្រកែក ហើយត្រូវសម្រេចដោយអាជ្ញាធរមានសមត្ថកិច្ច មិនមែនដោយសេវាព័ត៌មានទេ។\n\nមន្ត្រីអាចណែនាំអ្នកទៅអាជ្ញាធរទទួលបន្ទុក។",
    },
  },
  {
    // Section 6.2: case-specific calculation carrying financial liability.
    kind: "tax_computation",
    terminal: false,
    patterns: [
      /\b(how much tax|calculate (my )?tax|tax i owe|my tax liability|compute (the )?duty|how much (will|do) i (have to )?pay in tax)\b/i,
      /(គណនាពន្ធ|ពន្ធដែលខ្ញុំត្រូវបង់|ពន្ធប៉ុន្មាន)/,
    ],
    message: {
      en: "AskGov does not calculate tax. The amount depends on your specific circumstances and a wrong figure would carry real financial consequences for you.\n\nThe General Department of Taxation or an officer can help with a calculation.",
      km: "AskGov មិនគណនាពន្ធទេ។ ចំនួនទឹកប្រាក់អាស្រ័យលើកាលៈទេសៈជាក់លាក់របស់អ្នក ហើយតួលេខខុសនឹងបង្កផលវិបាកផ្នែកហិរញ្ញវត្ថុពិតប្រាកដដល់អ្នក។\n\nអគ្គនាយកដ្ឋានពន្ធដារ ឬមន្ត្រីអាចជួយក្នុងការគណនា។",
    },
  },
  {
    // Rule 7.
    kind: "political",
    terminal: false,
    patterns: [
      /\b(who should i vote|which party|prime minister('s)? (opinion|policy)|is the government (corrupt|good|bad)|political (opinion|view)|criticis[ez] the government)\b/i,
      /\b(what do you think of (the )?(minister|government|party))\b/i,
      /(គណបក្សណា|បោះឆ្នោតឱ្យ|រដ្ឋាភិបាលអាក្រក់|មតិនយោបាយ)/,
    ],
    message: {
      en: "AskGov does not comment on political matters, named officials, or specific disputes. It provides service information only.\n\nIf you have a question about a government procedure, ask it and AskGov will answer from an official source.",
      km: "AskGov មិនផ្តល់មតិលើបញ្ហានយោបាយ មន្ត្រីជាក់លាក់ ឬជម្លោះជាក់លាក់ទេ។ វាផ្តល់តែព័ត៌មានសេវាកម្មប៉ុណ្ណោះ។\n\nប្រសិនបើអ្នកមានសំណួរអំពីនីតិវិធីរដ្ឋាភិបាល សូមសួរ ហើយ AskGov នឹងឆ្លើយពីឯកសារយោងជាផ្លូវការ។",
    },
  },
  {
    // NG-03: AskGov is not a complaints system. It can say where to complain
    // (in scope: "complaints and appeals") but cannot receive one.
    kind: "complaint_routing",
    terminal: false,
    patterns: [
      /\b(i want to (file|make|lodge) a complaint|report (an? )?(officer|official|corruption)|this officer (took|demanded)|i am complaining about)\b/i,
      /(ខ្ញុំចង់ដាក់បណ្តឹង|រាយការណ៍អំពីមន្ត្រី|មន្ត្រីទារប្រាក់)/,
    ],
    message: {
      en: "AskGov cannot receive or process a complaint — it is an information service, not a grievance channel.\n\nIt can tell you where complaints for a given service are lodged and how an appeal works. An officer can take this further.",
      km: "AskGov មិនអាចទទួល ឬដំណើរការបណ្តឹងបានទេ — វាជាសេវាព័ត៌មាន មិនមែនជាបណ្តាញទទួលបណ្តឹងទេ។\n\nវាអាចប្រាប់អ្នកថាបណ្តឹងសម្រាប់សេវាណាមួយត្រូវដាក់នៅឯណា និងការតវ៉ាដំណើរការយ៉ាងណា។ មន្ត្រីអាចជួយបន្ថែម។",
    },
  },
];

/**
 * Screen a question before retrieval. Returns the first matching rule, in the
 * declared order — emergency wins over everything.
 */
export function screen(question: string): GuardrailHit | null {
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(question))) {
      return {
        kind: rule.kind,
        terminal: rule.terminal,
        message: rule.message,
      };
    }
  }
  return null;
}

/**
 * Is this not a government-service question at all?
 *
 * Distinct from both the refusal policy above and a content coverage gap. Three
 * different situations that all end in "no", and answering them identically is
 * what makes a correct refusal feel stupid:
 *
 *   policy         — a service question AskGov is not permitted to answer
 *   coverage gap   — a service question from a ministry not yet onboarded
 *   off-domain     — not a service question. Translation, general knowledge,
 *                    arithmetic, the weather
 *
 * Reciting the onboarded ministries at someone who asked how to say hello in
 * Khmer implies they picked the wrong ministry. They did not; they asked a
 * different kind of question, and the reply should say so.
 *
 * Deliberately narrow. "What does prakas mean?" must NOT land here — §6.1 puts
 * plain-language explanation of official terminology IN scope, so definition
 * questions belong in retrieval. This matches only unmistakable non-service
 * requests, and anything ambiguous falls through to the coverage-gap path.
 */
const OFF_DOMAIN: RegExp[] = [
  // Translation requests. Note "what does X mean" is absent on purpose.
  /\bhow do (you|i|we) say\b/i,
  /\btranslat(e|ion|ing)\b/i,
  /\bin khmer\b.*\?|\bhow.*\bin (khmer|english)\b/i,
  /\bwhat is .{1,30} in (khmer|english)\b/i,
  /(បកប្រែ|និយាយយ៉ាងណា)/,

  // General knowledge and chit-chat.
  /\b(capital of|who is the (president|king|prime minister) of|how old is|how tall is)\b/i,
  /\b(weather|forecast|temperature) (today|tomorrow|in)\b/i,
  /\b(tell me a |write me a )?(joke|poem|song|story|recipe)\b/i,
  /\b(football|movie|film|horoscope)\b/i,

  // Asking it to be a general assistant.
  /\b(write|debug|fix) (me )?(some |a )?(code|program|script|essay)\b/i,
  /\bwhat (do you think|is your opinion) (about|on)\b/i,

  // Bare arithmetic.
  /^[\d\s+\-*/().=]+\??$/,
];

/**
 * Positive scope signal: is there anything in this question that makes it a
 * government-service question at all?
 *
 * ── WHY A DENYLIST WAS NOT ENOUGH ──────────────────────────────────────────
 * OFF_DOMAIN above enumerates non-service requests. Enumeration cannot work
 * here: the set of things that are not government services is unbounded, and
 * every gap in it is a leak. Two that reached citizens:
 *
 *   "tom holland from spider man"        → a filmography, 12 bullets
 *   "i want to drink coffee, where
 *    should i go?"                       → café chains, opening hours, prices
 *
 * Neither matched a pattern above — no "movie", no "film", no "translate" — so
 * both fell through to the coverage-gap path, where GENERAL_FALLBACK_ENABLED
 * answered them from the model's own knowledge under the "not from an approved
 * source" banner. The banner is not the point. §6.1 scopes AskGov to government
 * service information; answering the question at all is the failure, and a
 * disclaimer on an out-of-scope answer is still an out-of-scope answer.
 *
 * So scope is decided positively: a question is in scope when it carries some
 * service signal, not when it happens to miss every pattern someone thought to
 * write down. That flips the failure mode from "unbounded leak" to "a service
 * question with unusual vocabulary gets refused" — the direction §13 prefers,
 * since a refusal is recoverable via the officer and a fluent wrong answer is
 * not.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * The lexicon is deliberately broad. It is not a topic list for the corpus — a
 * coverage gap is a question about a ministry not yet onboarded, and those must
 * still reach the coverage-gap path. It only asks whether the citizen is talking
 * about dealing with the state.
 */
const SERVICE_TERMS =
  /\b(passport|visa|immigration|citizenship|nationality|residence|residency|id ?card|identity|identification|birth|death|marriage|divorce|family (book|record)|certificate|licen[cs]e|permit|authorisation|authorization|register|registration|registry|deregister|renew|renewal|apply|application|applicant|submit|submission|document|documents|paperwork|form|fee|fees|charge|stamp duty|tax|taxation|customs|duty|excise|tariff|import|export|company|business|enterprise|sole proprietor|trademark|patent|copyright|land|title|deed|cadastral|property|vehicle|driving|driver|motorbike|motorcycle|car|truck|plate|inspection|ministry|department|authority|agency|municipality|province|provincial|district|khan|commune|sangkat|village|city hall|one ?window|counter|officer|official|government|state|public service|civil (status|registration)|notary|notari[sz]ed|legali[sz]ed|apostille|appeal|complaint|grievance|procedure|process|requirement|eligib|deadline|expiry|expire|validity|penalt(y|ies)|fine|fined|surcharge|late (fee|penalty|charge|payment|registration|submission)|overdue|arrears|exemption|waiver|refund|instal?ment|pension|social security|nssf|insurance|labour|labor|work permit|employment (card|book)|school|university|diploma|transcript|equivalence|health (certificate|card)|vaccination|police (clearance|record)|criminal record|court|bank account|construction|building permit|utility|water supply|electricity connection)\b/i;

/**
 * Procedural framing aimed at an institution. Catches in-scope questions whose
 * nouns are unusual — "what documents do I need for the thing at the commune" —
 * without catching "where should I go" on its own, which is the coffee question.
 */
const SERVICE_FRAMING: RegExp[] = [
  /\b(how do i|how can i|where do i|where can i|what do i need to)\s+(apply|register|renew|obtain|get|request|submit|file|declare|pay|claim|appeal)\b/i,
  /\bwhat (documents|papers|requirements|conditions)\b/i,
  /\bwhich (office|ministry|department|authority|counter|window)\b/i,
  /\bhow (much|long) does it (cost|take) to\b/i,
];

/**
 * Khmer service vocabulary — the same test, in the other script (FR-08).
 *
 * "The same test" is the requirement, and it is easy to break: the two lists are
 * maintained by hand and drift silently, because nothing fails when one gains a
 * term the other lacks. It cost a real refusal. SERVICE_TERMS carries a whole
 * penalty cluster — penalty, fine, surcharge, late fee, overdue, arrears — and
 * this one carried none, so "ហេតុអ្វីបានជាមានការពិន័យយឺតយ៉ាវ" ("why is there a
 * late penalty") was refused as not a government-service question, while the
 * identical English question was answered. A citizen asking in Khmer about a
 * government fine is asking the most in-scope question there is.
 *
 * When adding to either list, check the other.
 */
const SERVICE_TERMS_KM =
  /(លិខិតឆ្លងដែន|ទិដ្ឋាការ|អត្តសញ្ញាណប័ណ្ណ|សំបុត្រកំណើត|មរណភាព|អាពាហ៍ពិពាហ៍|លែងលះ|សៀវភៅគ្រួសារ|វិញ្ញាបនបត្រ|អាជ្ញាបណ្ណ|ច្បាប់អនុញ្ញាត|ចុះបញ្ជី|ចុះឈ្មោះ|ពាក្យសុំ|ស្នើសុំ|ឯកសារ|សំណុំបែបបទ|កម្រៃ|ថ្លៃសេវា|ពន្ធ|គយ|នាំចូល|នាំចេញ|ក្រុមហ៊ុន|អាជីវកម្ម|ម៉ាកសញ្ញា|ដីធ្លី|ប័ណ្ណកម្មសិទ្ធិ|យានយន្ត|បើកបរ|ប័ណ្ណបើកបរ|ក្រសួង|អាជ្ញាធរ|រាជធានី|ខេត្ត|ស្រុក|ខណ្ឌ|ឃុំ|សង្កាត់|សាលាក្រុង|មន្ត្រី|រដ្ឋាភិបាល|សេវាសាធារណៈ|សារការី|បណ្តឹង|តវ៉ា|នីតិវិធី|លក្ខខណ្ឌ|ផុតកំណត់|ពិន័យ|យឺតយ៉ាវ|ហួសកំណត់|ការលើកលែង|បង្វិលសង|សុវត្ថិភាពសង្គម|លិខិតអនុញ្ញាតការងារ|សញ្ញាបត្រ|សំបុត្រថ្កោលទោស|តុលាការ|សំណង់)/;

/**
 * Official terminology carries scope on its own: §6.1 puts plain-language
 * explanation of these terms IN scope, so "what does prakas mean" must survive
 * this gate. Read from the glossary rather than restated here, because a term
 * added to the glossary and not to this list would become unaskable — the
 * definition question would be refused as off-domain before the glossary that
 * answers it is ever consulted.
 */
function mentionsOfficialTerm(question: string): boolean {
  const q = normalizeFold(question);
  return getKb().glossary.some((entry) =>
    entry.match.some((alias) => containsWord(q, normalizeFold(alias))),
  );
}

/**
 * Romanised Khmer — "sombot kamnaot trauv ke ekasa avei khlah".
 *
 * Citizens type Khmer in Latin characters constantly, and nothing else in the
 * pipeline handles it: there is no romanisation layer, no romanised alias set,
 * and detectLang reads these as English. Before scope was decided positively
 * such a question reached the coverage-gap path by default, simply because no
 * denylist pattern matched it. It has to be named explicitly now, or asking for
 * a birth certificate in the way many people actually type it is refused.
 *
 * This is a partial list of common service words, not romanisation support. The
 * real fix is a romanised alias set maintained alongside data/aliases.json
 * (FR-06 content, not code); until then, unusual spellings will over-refuse.
 */
const SERVICE_TERMS_ROMAN =
  /\b(som?bot|sambot|kamnaot|komnaot|ka?mnaeut|ekasa|aekasa|ekasar|lekhet|chhlong ?den|attasanhean|atta ?sanhan|bat ?pracheachon|banhchi|chuh ?banhchi|krosuong|khum|sangkat|srok|khan|thlai ?sewa|bang ?kan ?dai|aphibal|meanotei|akaphearkech|sarakar)\b/i;

export function looksLikeServiceQuestion(question: string): boolean {
  if (SERVICE_TERMS.test(question)) return true;
  if (SERVICE_TERMS_KM.test(question)) return true;
  if (SERVICE_TERMS_ROMAN.test(question)) return true;
  if (SERVICE_FRAMING.some((p) => p.test(question))) return true;
  return mentionsOfficialTerm(question);
}

/**
 * Out of scope when an explicit off-domain pattern fires, OR when nothing marks
 * the question as being about a government service at all.
 *
 * `history` matters because scope is a property of the conversation, not of the
 * characters in the latest turn. "Where in phnom penh?" carries no service
 * signal on its own and is in scope after a driving-licence question; refusing
 * it because it is short would break every follow-up (FR-07).
 *
 * The test is isSubjectless() — the same one retrieval uses to decide whether a
 * turn can anchor a follow-up, so the two cannot drift into disagreeing about
 * what a follow-up is. A question that introduces its own subject is judged on
 * its own subject however deep in a conversation it appears: "tom holland from
 * spider man" has four content words and does not inherit anything.
 */
export function isOffDomain(
  question: string,
  history: Array<{ text: string; role?: string }> = [],
): boolean {
  if (OFF_DOMAIN.some((p) => p.test(question))) return true;
  if (looksLikeServiceQuestion(question)) return false;
  // Only a prior turn that was itself a service question can carry the topic
  // forward. An off-domain first turn is not a topic.
  const hasServiceAnchor = history.some(
    (t) => t.role !== "assistant" && looksLikeServiceQuestion(t.text),
  );
  return !(hasServiceAnchor && isSubjectless(question));
}

/**
 * A prior turn that must not rewrite or contextualise a later question.
 *
 * Judged the same way as a first message, against the turns already kept: a
 * short celebrity question is off-domain on its own, so it is dropped, while
 * "where in phnom penh?" stays after a licence question because that history
 * is a service anchor. Treating every short turn as a refinement is what
 * glued "who is elon musk?" onto "how do I get married?".
 */
export function isOffTopicTurn(
  text: string,
  prior: Array<{ text: string; role?: string }> = [],
): boolean {
  return isOffDomain(text, prior);
}

/**
 * Drop off-domain exchanges so they cannot rewrite a follow-up or travel into
 * the model as conversation context (FR-07).
 *
 * Walks in order: a turn stays only if it is still in-scope given the turns
 * already kept. Assistant replies ride with their user turn.
 */
export function inScopeHistory<T extends { text: string; role?: string }>(
  history: T[],
): T[] {
  const kept: T[] = [];
  for (let i = 0; i < history.length; i++) {
    const turn = history[i];
    if (turn.role === "assistant") {
      const prev = i > 0 ? history[i - 1] : undefined;
      if (prev && prev.role !== "assistant" && kept[kept.length - 1] === prev) {
        kept.push(turn);
      }
      continue;
    }
    if (!isOffDomain(turn.text, kept)) kept.push(turn);
  }
  return kept;
}

/**
 * Output moderation applied to every generated answer before delivery
 * (NFR-04). Catches cases where retrieval succeeded but the answer drifted
 * into refused territory — for example a source about appeals prompting the
 * model to advise on legal position.
 */
export function moderateOutput(answer: string): GuardrailHit | null {
  const advisory =
    /\b(you should sue|i recommend you (sue|refuse|ignore)|you are legally entitled to|you will definitely (get|receive|be approved))\b/i;

  if (advisory.test(answer)) {
    return {
      kind: "legal_advice",
      terminal: false,
      message: RULES.find((r) => r.kind === "legal_advice")!.message,
    };
  }

  return null;
}
