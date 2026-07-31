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

export function isOffDomain(question: string): boolean {
  return OFF_DOMAIN.some((p) => p.test(question));
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
