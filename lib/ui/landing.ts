/**
 * Landing page copy, bilingual — follows the SuperAsk Figma section by section.
 *
 * Headlines are split into [before, accent, after] so the accent word can take
 * the brand gradient in either language without string surgery in components.
 *
 * MOCK DATA: the team, partners, ministry count, channel handles and the
 * figures in the phone / browser illustrations are placeholders generated for
 * the design. Replace them with real values before launch. The Khmer is
 * prototype copy and needs review by a Khmer-speaking content officer.
 */

import type { Copy, Lang } from "./marketing";

export type Headline = Record<Lang, [string, string, string]>;

/* ── Nav ─────────────────────────────────────────────────────────────────── */

export const NAV = {
  links: [
    { id: "how-it-works", label: { en: "How it works", km: "របៀបដំណើរការ" } },
    { id: "channels", label: { en: "Channels", km: "បណ្តាញ" } },
    { id: "faqs", label: { en: "FAQs", km: "សំណួរញឹកញាប់" } },
  ],
  askNow: { en: "Ask now →", km: "សួរឥឡូវនេះ →" } satisfies Copy,
  menu: { en: "Menu", km: "ម៉ឺនុយ" } satisfies Copy,
};

/* ── Hero ────────────────────────────────────────────────────────────────── */

export const HERO = {
  eyebrow: {
    en: "AI for public services in Cambodia",
    km: "AI សម្រាប់សេវាសាធារណៈនៅកម្ពុជា",
  } satisfies Copy,
  title: {
    en: ["Know ", "exactly", " what the government needs from you — before you go."],
    km: ["ដឹងឱ្យ", "ច្បាស់", "ថារដ្ឋាភិបាលត្រូវការអ្វីពីអ្នក — មុនពេលអ្នកទៅ។"],
  } satisfies Headline,
  body: {
    en: "SuperAsk is a free, sourced AI assistant that tells any Cambodian what a government procedure actually requires. Every answer cites its official source.",
    km: "SuperAsk គឺជាជំនួយការ AI ឥតគិតថ្លៃ ដែលប្រាប់ប្រជាពលរដ្ឋកម្ពុជាគ្រប់រូបថា នីតិវិធីរដ្ឋបាលនីមួយៗតម្រូវឱ្យមានអ្វីខ្លះ។ ចម្លើយនីមួយៗបង្ហាញឯកសារយោងផ្លូវការ។",
  } satisfies Copy,
  cta: { en: "Ask on the web", km: "សួរតាមគេហទំព័រ" } satisfies Copy,
  orChat: {
    en: "or chat on Telegram / Messenger",
    km: "ឬជជែកតាម Telegram / Messenger",
  } satisfies Copy,
  fineprint: {
    en: "Free · No account · Khmer & English · Every answer is sourced",
    km: "ឥតគិតថ្លៃ · មិនចាំបាច់មានគណនី · ខ្មែរ និងអង់គ្លេស · ចម្លើយមានឯកសារយោង",
  } satisfies Copy,
  chipSource: {
    en: "Ministry of Public Works · Official notice · Verified 12 Sep 2026",
    km: "ក្រសួងសាធារណការ · សេចក្តីជូនដំណឹងផ្លូវការ · ផ្ទៀងផ្ទាត់ ១២ កញ្ញា ២០២៦",
  } satisfies Copy,
};

/* ── Shared bits ─────────────────────────────────────────────────────────── */

export const COMMON = {
  verifiedSource: { en: "Verified source", km: "ប្រភពបានផ្ទៀងផ្ទាត់" } satisfies Copy,
  availableOnBoth: { en: "Available on both", km: "មានលើទាំងពីរ" } satisfies Copy,
  today: { en: "Today", km: "ថ្ងៃនេះ" } satisfies Copy,
  openWeb: { en: "Open SuperAsk Web", km: "បើក SuperAsk Web" } satisfies Copy,
};

/* ── Phone mock-ups (hero + "See it in action") ──────────────────────────── */

export type PhoneDemo = {
  title: Copy;
  queryKm: string;
  queryEn: string;
  rows: Array<{ label: Copy; val: Copy }>;
  source: Copy;
  chip: Copy;
  accent: string;
};

const L = {
  documents: { en: "Documents", km: "ឯកសារ" },
  fee: { en: "Fee", km: "ថ្លៃសេវា" },
  time: { en: "Time", km: "រយៈពេល" },
  office: { en: "Office", km: "ការិយាល័យ" },
} satisfies Record<string, Copy>;

export const HERO_DEMO: PhoneDemo = {
  title: { en: "Driving Licence Renewal", km: "ការបន្តប័ណ្ណបើកបរ" },
  queryKm: "តើខ្ញុំត្រូវការឯកសារអ្វីខ្លះ?",
  queryEn: "What do I need to renew my licence?",
  rows: [
    {
      label: L.documents,
      val: {
        en: "Current licence, ID card, medical cert, 2 photos",
        km: "ប័ណ្ណចាស់ អត្តសញ្ញាណប័ណ្ណ លិខិតបញ្ជាក់សុខភាព រូបថត ២សន្លឹក",
      },
    },
    { label: L.fee, val: { en: "35,000–45,000 KHR", km: "៣៥.០០០–៤៥.០០០ រៀល" } },
    { label: L.time, val: { en: "1–2 working days", km: "១–២ ថ្ងៃធ្វើការ" } },
    { label: L.office, val: { en: "MPWT local dept.", km: "មន្ទីរសាធារណការខេត្ត" } },
  ],
  source: {
    en: "Source: MPWT Notice — Verified 12 Sep 2026",
    km: "ប្រភព៖ សេចក្តីជូនដំណឹង ក.ស.ដ — ផ្ទៀងផ្ទាត់ ១២ កញ្ញា ២០២៦",
  },
  chip: HERO.chipSource,
  accent: "#046EC5",
};

export const IN_ACTION = {
  eyebrow: { en: "See it in action", km: "មើលការប្រើប្រាស់ជាក់ស្តែង" } satisfies Copy,
  title: {
    en: ["Real answers for real ", "procedures", "."],
    km: ["ចម្លើយពិតប្រាកដ សម្រាប់", "នីតិវិធី", "ពិតប្រាកដ។"],
  } satisfies Headline,
  body: {
    en: "Every response is structured, sourced, and available in both Khmer and English — on web, Telegram, or Messenger.",
    km: "ចម្លើយនីមួយៗមានរចនាសម្ព័ន្ធច្បាស់ មានឯកសារយោង និងមានទាំងភាសាខ្មែរ និងអង់គ្លេស — លើគេហទំព័រ Telegram ឬ Messenger។",
  } satisfies Copy,
  demos: [
    {
      title: { en: "Passport Application", km: "ការស្នើសុំលិខិតឆ្លងដែន" },
      queryKm: "តើខ្ញុំអាចដាក់ពាក្យសុំលិខិតឆ្លងដែនដោយរបៀបណា?",
      queryEn: "How do I apply for a passport?",
      rows: [
        {
          label: L.documents,
          val: {
            en: "Birth cert, ID card, 2 photos, residency proof",
            km: "សំបុត្រកំណើត អត្តសញ្ញាណប័ណ្ណ រូបថត ២សន្លឹក លិខិតបញ្ជាក់ទីលំនៅ",
          },
        },
        {
          label: L.fee,
          val: {
            en: "USD 100 (standard) · USD 200 (urgent)",
            km: "១០០ ដុល្លារ (ធម្មតា) · ២០០ ដុល្លារ (បន្ទាន់)",
          },
        },
        { label: L.time, val: { en: "15 working days standard", km: "១៥ ថ្ងៃធ្វើការ (ធម្មតា)" } },
        {
          label: L.office,
          val: { en: "Dept. of Immigration, Phnom Penh", km: "នាយកដ្ឋានអន្តោប្រវេសន៍ ភ្នំពេញ" },
        },
      ],
      source: {
        en: "Dept. of Immigration Notice — Verified 8 Sep 2026",
        km: "សេចក្តីជូនដំណឹងនាយកដ្ឋានអន្តោប្រវេសន៍ — ផ្ទៀងផ្ទាត់ ៨ កញ្ញា ២០២៦",
      },
      chip: {
        en: "Dept. of Immigration · Official portal · Verified 8 Sep 2026",
        km: "នាយកដ្ឋានអន្តោប្រវេសន៍ · វិបផតថលផ្លូវការ · ផ្ទៀងផ្ទាត់ ៨ កញ្ញា ២០២៦",
      },
      accent: "#046EC5",
    },
    {
      title: { en: "Business Registration", km: "ការចុះបញ្ជីអាជីវកម្ម" },
      queryKm: "តើខ្ញុំត្រូវធ្វើអ្វីខ្លះដើម្បីចុះបញ្ជីក្រុមហ៊ុន?",
      queryEn: "What do I need to register a company?",
      rows: [
        {
          label: L.documents,
          val: {
            en: "ID card, address proof, company articles, MoC form",
            km: "អត្តសញ្ញាណប័ណ្ណ លិខិតបញ្ជាក់អាសយដ្ឋាន លក្ខន្តិកៈ ទម្រង់ ក.ព",
          },
        },
        { label: L.fee, val: { en: "USD 45 + USD 5 stamp duty", km: "៤៥ ដុល្លារ + ពន្ធតែម ៥ ដុល្លារ" } },
        { label: L.time, val: { en: "3–5 working days", km: "៣–៥ ថ្ងៃធ្វើការ" } },
        {
          label: L.office,
          val: { en: "Ministry of Commerce online portal", km: "វិបផតថលអនឡាញក្រសួងពាណិជ្ជកម្ម" },
        },
      ],
      source: {
        en: "Ministry of Commerce Prakas — Verified 5 Sep 2026",
        km: "ប្រកាសក្រសួងពាណិជ្ជកម្ម — ផ្ទៀងផ្ទាត់ ៥ កញ្ញា ២០២៦",
      },
      chip: {
        en: "Ministry of Commerce · Prakas No. 123 · Verified 5 Sep 2026",
        km: "ក្រសួងពាណិជ្ជកម្ម · ប្រកាសលេខ ១២៣ · ផ្ទៀងផ្ទាត់ ៥ កញ្ញា ២០២៦",
      },
      accent: "#0A6ABF",
    },
    {
      title: { en: "Birth Certificate", km: "សំបុត្រកំណើត" },
      queryKm: "តើខ្ញុំត្រូវការឯកសារអ្វីសម្រាប់សំបុត្រកំណើត?",
      queryEn: "How do I get a birth certificate?",
      rows: [
        {
          label: L.documents,
          val: {
            en: "Hospital record, parents' ID cards, family book",
            km: "លិខិតពីមន្ទីរពេទ្យ អត្តសញ្ញាណប័ណ្ណឪពុកម្តាយ សៀវភៅគ្រួសារ",
          },
        },
        {
          label: L.fee,
          val: {
            en: "Free (within 30 days) · 2,000 KHR late fee",
            km: "ឥតគិតថ្លៃ (ក្នុង ៣០ថ្ងៃ) · ពិន័យយឺត ២.០០០ រៀល",
          },
        },
        { label: L.time, val: { en: "Same day", km: "ក្នុងថ្ងៃតែមួយ" } },
        {
          label: L.office,
          val: { en: "Commune / Sangkat office of birth", km: "សាលាឃុំ/សង្កាត់ ទីកន្លែងកំណើត" },
        },
      ],
      source: {
        en: "Ministry of Interior Circular — Verified 2 Sep 2026",
        km: "សារាចរក្រសួងមហាផ្ទៃ — ផ្ទៀងផ្ទាត់ ២ កញ្ញា ២០២៦",
      },
      chip: {
        en: "Ministry of Interior · Official circular · Verified 2 Sep 2026",
        km: "ក្រសួងមហាផ្ទៃ · សារាចរផ្លូវការ · ផ្ទៀងផ្ទាត់ ២ កញ្ញា ២០២៦",
      },
      accent: "#1A7DB5",
    },
  ] satisfies PhoneDemo[],
};

/* ── Stats band ──────────────────────────────────────────────────────────── */

export const STATS = {
  items: [
    {
      icon: "building",
      n: "30+",
      label: { en: "Ministries & institutions covered", km: "ក្រសួង និងស្ថាប័នដែលគ្របដណ្តប់" },
    },
    {
      // Real: rows in data/registry/websites_master.csv.
      icon: "file",
      n: "130+",
      label: { en: "Official websites monitored", km: "គេហទំព័រផ្លូវការដែលតាមដាន" },
    },
    {
      icon: "chat",
      n: "3",
      label: { en: "Channels — web, Telegram, Messenger", km: "បណ្តាញ — គេហទំព័រ Telegram Messenger" },
    },
    {
      icon: "globe",
      n: "2",
      label: { en: "Languages — Khmer & English", km: "ភាសា — ខ្មែរ និងអង់គ្លេស" },
    },
  ] as const,
  caption: {
    en: "Coverage in numbers · Updated September 2026",
    km: "ការគ្របដណ្តប់ជាតួលេខ · ធ្វើបច្ចុប្បន្នភាព កញ្ញា ២០២៦",
  } satisfies Copy,
};

/* ── Why ─────────────────────────────────────────────────────────────────── */

export const WHY = {
  eyebrow: { en: "Why SuperAsk", km: "ហេតុអ្វី SuperAsk" } satisfies Copy,
  title: {
    en: ["Finding out what's required shouldn't require knowing ", "someone", "."],
    km: ["ការស្វែងយល់ពីអ្វីដែលត្រូវការ មិនគួរតម្រូវឱ្យអ្នក", "ស្គាល់អ្នកណាម្នាក់", "នោះទេ។"],
  } satisfies Headline,
  cards: [
    {
      n: "01",
      accent: "#046EC5",
      label: { en: "Scattered everywhere", km: "ព័ត៌មានរាយប៉ាយគ្រប់ទីកន្លែង" },
      sub: {
        en: "Official information lives across 100+ ministry websites, Facebook pages and Telegram channels. There's no single place to look.",
        km: "ព័ត៌មានផ្លូវការស្ថិតនៅលើគេហទំព័រក្រសួងជាង ១០០ ទំព័រ Facebook និងឆានែល Telegram។ គ្មានកន្លែងតែមួយសម្រាប់ស្វែងរកទេ។",
      },
    },
    {
      n: "02",
      accent: "#1A8FD1",
      label: { en: "Invisible to search", km: "ស្វែងរកមិនឃើញ" },
      sub: {
        en: "Much Khmer guidance is posted as images: public, but unsearchable, often undated and unowned.",
        km: "ការណែនាំជាភាសាខ្មែរជាច្រើនត្រូវបានបង្ហោះជារូបភាព៖ សាធារណៈ ប៉ុន្តែស្វែងរកមិនបាន ហើយច្រើនតែគ្មានកាលបរិច្ឆេទ ឬម្ចាស់។",
      },
    },
    {
      n: "03",
      accent: "#35C1A7",
      label: { en: "Paid for what's free", km: "បង់ថ្លៃលើអ្វីដែលឥតគិតថ្លៃ" },
      sub: {
        en: "Citizens arrive with wrong documents, lose a day and a wage, or pay a broker for information the state publishes for free.",
        km: "ប្រជាពលរដ្ឋមកដល់ជាមួយឯកសារខុស បាត់បង់មួយថ្ងៃនិងប្រាក់ឈ្នួល ឬបង់ថ្លៃឱ្យមេខ្យល់ សម្រាប់ព័ត៌មានដែលរដ្ឋផ្សព្វផ្សាយដោយឥតគិតថ្លៃ។",
      },
    },
  ],
  quote: {
    en: "“People pay intermediaries for information the state gives away for free. We're ending that.”",
    km: "«ប្រជាជនបង់ថ្លៃឱ្យឈ្មួញកណ្តាល សម្រាប់ព័ត៌មានដែលរដ្ឋផ្តល់ឱ្យដោយឥតគិតថ្លៃ។ យើងនឹងបញ្ចប់រឿងនេះ។»",
  } satisfies Copy,
};

/* ── Comparison table ────────────────────────────────────────────────────── */

export const COMPARE = {
  eyebrow: { en: "Why it matters", km: "ហេតុអ្វីវាសំខាន់" } satisfies Copy,
  title: {
    en: ["The ", "difference", " is in the detail."],
    km: ["", "ភាពខុសគ្នា", "ស្ថិតនៅក្នុងព័ត៌មានលម្អិត។"],
  } satisfies Headline,
  head: {
    topic: { en: "Topic", km: "ប្រធានបទ" },
    without: { en: "Without SuperAsk", km: "គ្មាន SuperAsk" },
    with: { en: "With SuperAsk", km: "ជាមួយ SuperAsk" },
  } satisfies Record<string, Copy>,
  rows: [
    {
      topic: { en: "Finding procedure info", km: "ការស្វែងរកព័ត៌មាននីតិវិធី" },
      old: { en: "Browse 10+ ministry websites", km: "រុករកគេហទំព័រក្រសួងជាង ១០" },
      ours: { en: "One question, one answer", km: "សំណួរមួយ ចម្លើយមួយ" },
    },
    {
      topic: { en: "Language", km: "ភាសា" },
      old: { en: "Mostly Khmer-only PDFs", km: "ភាគច្រើនជា PDF ខ្មែរតែប៉ុណ្ណោះ" },
      ours: { en: "Khmer and English, always", km: "ខ្មែរ និងអង់គ្លេស ជានិច្ច" },
    },
    {
      topic: { en: "Source transparency", km: "តម្លាភាពប្រភព" },
      old: { en: "Unknown — no attribution", km: "មិនដឹង — គ្មានការបញ្ជាក់ប្រភព" },
      ours: { en: "Ministry, document & date cited", km: "បញ្ជាក់ក្រសួង ឯកសារ និងកាលបរិច្ឆេទ" },
    },
    {
      topic: { en: "Accuracy guarantee", km: "ការធានាភាពត្រឹមត្រូវ" },
      old: { en: "None — often outdated", km: "គ្មាន — ច្រើនតែហួសសម័យ" },
      ours: { en: "Manually verified, re-checked regularly", km: "ផ្ទៀងផ្ទាត់ដោយមនុស្ស និងពិនិត្យឡើងវិញជាប្រចាំ" },
    },
    {
      topic: { en: "Cost", km: "តម្លៃ" },
      old: { en: "Free to find, or pay a broker", km: "រកដោយខ្លួនឯង ឬបង់ថ្លៃមេខ្យល់" },
      ours: { en: "Always free, no broker needed", km: "ឥតគិតថ្លៃជានិច្ច មិនត្រូវការមេខ្យល់" },
    },
    {
      topic: { en: "Channel", km: "បណ្តាញ" },
      old: { en: "Desktop only, bad on mobile", km: "កុំព្យូទ័រតែប៉ុណ្ណោះ ពិបាកប្រើលើទូរស័ព្ទ" },
      ours: { en: "Web, Telegram & Messenger", km: "គេហទំព័រ Telegram និង Messenger" },
    },
  ],
};

/* ── How it works ────────────────────────────────────────────────────────── */

export const HOW = {
  eyebrow: { en: "How it works", km: "របៀបដំណើរការ" } satisfies Copy,
  title: {
    en: ["Not a chatbot that guesses. A portal that ", "cites", "."],
    km: ["មិនមែនជាឆាតបូតដែលទាយទេ។ ជាវិបផតថលដែល", "ដកស្រង់ប្រភព", "។"],
  } satisfies Headline,
  steps: [
    {
      label: { en: "You ask in your own words", km: "អ្នកសួរតាមពាក្យសម្តីរបស់អ្នក" },
      detail: {
        en: "Type or speak in Khmer or English — no special syntax required.",
        km: "វាយជាភាសាខ្មែរ ឬអង់គ្លេស — មិនត្រូវការទម្រង់ពិសេសទេ។",
      },
    },
    {
      label: { en: "We identify what you actually need", km: "យើងកំណត់អ្វីដែលអ្នកពិតជាត្រូវការ" },
      detail: {
        en: "Our model distinguishes your real intent from the literal wording of your question.",
        km: "ម៉ូដែលរបស់យើងបែងចែកគោលបំណងពិតរបស់អ្នក ពីពាក្យពេចន៍នៃសំណួរ។",
      },
    },
    {
      label: {
        en: "We retrieve only verified official information",
        km: "យើងទាញយកតែព័ត៌មានផ្លូវការដែលបានផ្ទៀងផ្ទាត់",
      },
      detail: {
        en: "Results are pulled exclusively from sources our team has manually approved.",
        km: "លទ្ធផលត្រូវបានទាញយកតែពីប្រភពដែលក្រុមការងារបានអនុម័តដោយផ្ទាល់។",
      },
    },
    {
      label: {
        en: "You get the answer with its source attached",
        km: "អ្នកទទួលបានចម្លើយ រួមជាមួយឯកសារយោង",
      },
      detail: {
        en: "Ministry name, document, effective date, and when we last verified — every time.",
        km: "ឈ្មោះក្រសួង ឯកសារ កាលបរិច្ឆេទចូលជាធរមាន និងពេលផ្ទៀងផ្ទាត់ចុងក្រោយ — គ្រប់ពេល។",
      },
    },
  ],
  typical: { en: "Typical AI", km: "AI ទូទៅ" } satisfies Copy,
  typicalFlow: { en: "Question → Answer", km: "សំណួរ → ចម្លើយ" } satisfies Copy,
  oursFlow: {
    en: "Question → Intent → Verified source → Answer + citation",
    km: "សំណួរ → គោលបំណង → ប្រភពផ្ទៀងផ្ទាត់ → ចម្លើយ + ឯកសារយោង",
  } satisfies Copy,
};

/* ── Key features (dark band) ────────────────────────────────────────────── */

export const FEATURES = {
  eyebrow: { en: "Key features", km: "លក្ខណៈពិសេស" } satisfies Copy,
  title: {
    en: ["One place for ", "every", " ministry."],
    km: ["កន្លែងតែមួយសម្រាប់", "គ្រប់", "ក្រសួង។"],
  } satisfies Headline,
  cards: [
    {
      title: { en: "The crawler", km: "កម្មវិធីតាមដាន" },
      body: {
        en: "We continuously monitor official websites, Facebook pages and Telegram channels of Cambodian ministries and public institutions.",
        km: "យើងតាមដានជាប្រចាំនូវគេហទំព័រផ្លូវការ ទំព័រ Facebook និងឆានែល Telegram របស់ក្រសួង និងស្ថាប័នសាធារណៈកម្ពុជា។",
      },
    },
    {
      title: { en: "Verified only", km: "តែប្រភពបានផ្ទៀងផ្ទាត់" },
      body: {
        en: "Every source is manually checked and approved as legitimate before it enters our knowledge base.",
        km: "ប្រភពនីមួយៗត្រូវបានពិនិត្យ និងអនុម័តដោយមនុស្ស មុនពេលចូលក្នុងមូលដ្ឋានចំណេះដឹងរបស់យើង។",
      },
    },
    {
      title: { en: "Always cited", km: "មានឯកសារយោងជានិច្ច" },
      body: {
        en: "Each answer shows the ministry, the document, the effective date, and when we last verified it.",
        km: "ចម្លើយនីមួយៗបង្ហាញក្រសួង ឯកសារ កាលបរិច្ឆេទចូលជាធរមាន និងពេលផ្ទៀងផ្ទាត់ចុងក្រោយ។",
      },
    },
  ],
  monitored: { en: "Monitored sources", km: "ប្រភពដែលតាមដាន" } satisfies Copy,
  monitoredList: [
    { en: "Ministry of Interior", km: "ក្រសួងមហាផ្ទៃ" },
    { en: "Ministry of Finance", km: "ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ" },
    { en: "Ministry of Commerce", km: "ក្រសួងពាណិជ្ជកម្ម" },
    { en: "Municipality of Phnom Penh", km: "សាលារាជធានីភ្នំពេញ" },
  ] satisfies Copy[],
  queue: { en: "Verification queue", km: "ជួរផ្ទៀងផ្ទាត់" } satisfies Copy,
  queueList: [
    { s: "MPWT Official Notice", ok: true },
    { s: "MEF Revenue Circular", ok: true },
    { s: "Unverified channel", ok: false },
  ],
  verified: { en: "Verified", km: "បានផ្ទៀងផ្ទាត់" } satisfies Copy,
  excluded: { en: "Excluded", km: "មិនរាប់បញ្ចូល" } satisfies Copy,
  citedClaim: {
    en: "Business registration requires 4 documents and costs USD 45.",
    km: "ការចុះបញ្ជីអាជីវកម្មត្រូវការឯកសារ ៤ ហើយមានតម្លៃ ៤៥ ដុល្លារ។",
  } satisfies Copy,
  citedMinistry: { en: "Ministry of Commerce", km: "ក្រសួងពាណិជ្ជកម្ម" } satisfies Copy,
  citedMeta: {
    en: "Prakas No. 123 · Effective 1 Jan 2026 · Verified 10 Sep 2026",
    km: "ប្រកាសលេខ ១២៣ · ចូលជាធរមាន ១ មករា ២០២៦ · ផ្ទៀងផ្ទាត់ ១០ កញ្ញា ២០២៦",
  } satisfies Copy,
};

/* ── Web experience ──────────────────────────────────────────────────────── */

export const WEB = {
  eyebrow: { en: "Web experience", km: "បទពិសោធន៍លើគេហទំព័រ" } satisfies Copy,
  title: {
    en: ["Full-featured on any ", "browser", "."],
    km: ["មុខងារពេញលេញ លើគ្រប់", "កម្មវិធីរុករក", "។"],
  } satisfies Headline,
  body: {
    en: "The web app gives you the complete SuperAsk experience — search, browse procedures by category, and see the full citation trail for every answer. No download, no account.",
    km: "កម្មវិធីគេហទំព័រផ្តល់បទពិសោធន៍ SuperAsk ពេញលេញ — ស្វែងរក រុករកនីតិវិធីតាមប្រភេទ និងមើលឯកសារយោងពេញលេញសម្រាប់ចម្លើយនីមួយៗ។ មិនចាំបាច់ទាញយក មិនចាំបាច់មានគណនី។",
  } satisfies Copy,
  points: [
    {
      label: { en: "Search in Khmer or English", km: "ស្វែងរកជាភាសាខ្មែរ ឬអង់គ្លេស" },
      detail: { en: "Type naturally — the model handles the rest.", km: "វាយដោយធម្មជាតិ — ម៉ូដែលនឹងដោះស្រាយនៅសល់។" },
    },
    {
      label: { en: "Browse by ministry", km: "រុករកតាមក្រសួង" },
      detail: { en: "Filter procedures by department or topic.", km: "ច្រោះនីតិវិធីតាមនាយកដ្ឋាន ឬប្រធានបទ។" },
    },
    {
      label: { en: "Full citation trail", km: "ឯកសារយោងពេញលេញ" },
      detail: {
        en: "See the source document, effective date and verification date.",
        km: "មើលឯកសារប្រភព កាលបរិច្ឆេទចូលជាធរមាន និងកាលបរិច្ឆេទផ្ទៀងផ្ទាត់។",
      },
    },
  ],
  browserNav: [
    { en: "Home", km: "ទំព័រដើម" },
    { en: "Procedures", km: "នីតិវិធី" },
    { en: "About", km: "អំពីយើង" },
  ] satisfies Copy[],
  searchValue: "ការស្នើសុំលិខិតឆ្លងដែន — Passport application…",
  ask: { en: "Ask", km: "សួរ" } satisfies Copy,
  showing: {
    en: "Showing verified result for: Passport Application",
    km: "កំពុងបង្ហាញលទ្ធផលដែលបានផ្ទៀងផ្ទាត់សម្រាប់៖ លិខិតឆ្លងដែន",
  } satisfies Copy,
  resultTitle: { en: "Passport Application — Cambodia", km: "ការស្នើសុំលិខិតឆ្លងដែន — កម្ពុជា" } satisfies Copy,
  resultRows: [
    { l: { en: "Documents", km: "ឯកសារ" }, v: { en: "Birth cert, ID card, 2 photos", km: "សំបុត្រកំណើត អត្តសញ្ញាណប័ណ្ណ រូបថត ២" } },
    { l: { en: "Fee", km: "ថ្លៃសេវា" }, v: { en: "USD 100 standard / USD 200 urgent", km: "១០០$ ធម្មតា / ២០០$ បន្ទាន់" } },
    { l: { en: "Processing", km: "រយៈពេល" }, v: { en: "15 working days", km: "១៥ ថ្ងៃធ្វើការ" } },
    { l: { en: "Office", km: "ការិយាល័យ" }, v: { en: "Dept. of Immigration, Phnom Penh", km: "នាយកដ្ឋានអន្តោប្រវេសន៍ ភ្នំពេញ" } },
  ] satisfies Array<{ l: Copy; v: Copy }>,
  resultSource: {
    en: "Dept. of Immigration · Official portal · Verified 8 Sep 2026",
    km: "នាយកដ្ឋានអន្តោប្រវេសន៍ · វិបផតថលផ្លូវការ · ផ្ទៀងផ្ទាត់ ៨ កញ្ញា ២០២៦",
  } satisfies Copy,
  related: [
    { en: "Renew passport", km: "បន្តលិខិតឆ្លងដែន" },
    { en: "Lost passport", km: "បាត់លិខិតឆ្លងដែន" },
    { en: "Child passport", km: "លិខិតឆ្លងដែនកុមារ" },
    { en: "Emergency travel doc", km: "ឯកសារធ្វើដំណើរបន្ទាន់" },
  ] satisfies Copy[],
};

/* ── Anatomy of an answer ────────────────────────────────────────────────── */

export const ANATOMY = {
  eyebrow: { en: "Anatomy of an answer", km: "រចនាសម្ព័ន្ធនៃចម្លើយ" } satisfies Copy,
  title: {
    en: ["Every part of the response is ", "intentional", "."],
    km: ["គ្រប់ផ្នែកនៃចម្លើយ", "មានគោលបំណង", "។"],
  } satisfies Headline,
  body: {
    en: "Nothing is filler. Each section of a SuperAsk answer exists for a reason.",
    km: "គ្មានអ្វីជាការបំពេញចន្លោះទេ។ ផ្នែកនីមួយៗនៃចម្លើយ SuperAsk មានហេតុផលរបស់វា។",
  } satisfies Copy,
  assistant: { en: "Verified AI assistant", km: "ជំនួយការ AI ដែលបានផ្ទៀងផ្ទាត់" } satisfies Copy,
  topic: { en: "Driving Licence Renewal", km: "ការបន្តប័ណ្ណបើកបរ" } satisfies Copy,
  intentLabel: { en: "Identified intent: ", km: "គោលបំណងដែលបានកំណត់៖ " } satisfies Copy,
  intent: {
    en: "Renew a driving licence — Cambodia, Class B",
    km: "បន្តប័ណ្ណបើកបរ — កម្ពុជា ប្រភេទ B",
  } satisfies Copy,
  fields: [
    {
      label: { en: "Documents required", km: "ឯកសារដែលត្រូវការ" },
      val: {
        en: "Current licence, national ID, medical certificate, 2 passport photos",
        km: "ប័ណ្ណបើកបរចាស់ អត្តសញ្ញាណប័ណ្ណ លិខិតបញ្ជាក់សុខភាព រូបថត ២សន្លឹក",
      },
    },
    {
      label: { en: "Official fee", km: "ថ្លៃសេវាផ្លូវការ" },
      val: {
        en: "35,000 – 45,000 KHR depending on licence class",
        km: "៣៥.០០០ – ៤៥.០០០ រៀល អាស្រ័យលើប្រភេទប័ណ្ណ",
      },
    },
    {
      label: { en: "Processing time", km: "រយៈពេលដំណើរការ" },
      val: { en: "1 – 2 working days", km: "១ – ២ ថ្ងៃធ្វើការ" },
    },
    {
      label: { en: "Where to go", km: "ទីកន្លែងត្រូវទៅ" },
      val: {
        en: "Ministry of Public Works and Transport — provincial dept.",
        km: "ក្រសួងសាធារណការ និងដឹកជញ្ជូន — មន្ទីរខេត្ត",
      },
    },
  ],
  sourceLabel: { en: "Source", km: "ប្រភព" } satisfies Copy,
  sourceText: {
    en: "Ministry of Public Works and Transport · Official Notice No. 456 · Effective 1 Mar 2026 · ",
    km: "ក្រសួងសាធារណការ និងដឹកជញ្ជូន · សេចក្តីជូនដំណឹងលេខ ៤៥៦ · ចូលជាធរមាន ១ មីនា ២០២៦ · ",
  } satisfies Copy,
  verifiedOn: { en: "Verified 12 Sep 2026", km: "ផ្ទៀងផ្ទាត់ ១២ កញ្ញា ២០២៦" } satisfies Copy,
  notes: [
    {
      top: "8%",
      label: { en: "Intent detection", km: "ការកំណត់គោលបំណង" },
      detail: {
        en: "Your question is parsed into a structured query before retrieval begins.",
        km: "សំណួររបស់អ្នកត្រូវបានបំប្លែងជាសំណួរមានរចនាសម្ព័ន្ធ មុនពេលស្វែងរក។",
      },
    },
    {
      top: "36%",
      label: { en: "Structured fields", km: "វាលព័ត៌មានមានរចនាសម្ព័ន្ធ" },
      detail: {
        en: "Documents, fees, timelines and offices are extracted into labelled fields — never buried in prose.",
        km: "ឯកសារ ថ្លៃសេវា រយៈពេល និងការិយាល័យ ត្រូវបានដាក់ជាវាលមានស្លាក — មិនលាក់ក្នុងអត្ថបទវែងៗទេ។",
      },
    },
    {
      top: "72%",
      label: { en: "Citation block", km: "ប្លុកឯកសារយោង" },
      detail: {
        en: "Every answer ends with the ministry, document name, effective date and last-verified date.",
        km: "ចម្លើយនីមួយៗបញ្ចប់ដោយក្រសួង ឈ្មោះឯកសារ កាលបរិច្ឆេទចូលជាធរមាន និងកាលបរិច្ឆេទផ្ទៀងផ្ទាត់ចុងក្រោយ។",
      },
    },
  ],
};

/* ── Examples ────────────────────────────────────────────────────────────── */

export const EXAMPLES = {
  eyebrow: { en: "Examples", km: "ឧទាហរណ៍" } satisfies Copy,
  title: {
    en: ["Ask about the procedures people ", "actually", " need."],
    km: ["សួរអំពីនីតិវិធីដែលប្រជាជន", "ពិតជា", "ត្រូវការ។"],
  } satisfies Headline,
  body: {
    en: "Tap any topic to try it — no account needed.",
    km: "ចុចលើប្រធានបទណាមួយដើម្បីសាកល្បង — មិនចាំបាច់មានគណនី។",
  } satisfies Copy,
};

/** Topic chips. `ask` is what is sent to the chat in each language. */
export const TOPICS: Array<{ km: string; en: string; ask: Copy }> = [
  {
    km: "ការបន្តប័ណ្ណបើកបរ",
    en: "Driving licence renewal",
    ask: { en: "How do I renew my driving licence?", km: "តើខ្ញុំបន្តអាយុកាលប័ណ្ណបើកបរដោយរបៀបណា?" },
  },
  {
    km: "ការស្នើសុំលិខិតឆ្លងដែន",
    en: "Passport application",
    ask: { en: "How do I apply for a passport?", km: "តើខ្ញុំដាក់ពាក្យសុំលិខិតឆ្លងដែនដោយរបៀបណា?" },
  },
  {
    km: "សំបុត្រកំណើត",
    en: "Birth certificate",
    ask: { en: "What documents do I need for a birth certificate?", km: "ត្រូវការឯកសារអ្វីខ្លះសម្រាប់សំបុត្រកំណើត?" },
  },
  {
    km: "ការចុះបញ្ជីអាជីវកម្ម",
    en: "Business registration",
    ask: { en: "How do I register a business?", km: "តើខ្ញុំចុះបញ្ជីអាជីវកម្មដោយរបៀបណា?" },
  },
  {
    km: "ការចុះបញ្ជីយានយន្ត",
    en: "Vehicle registration",
    ask: { en: "How do I register a vehicle?", km: "តើខ្ញុំចុះបញ្ជីយានយន្តដោយរបៀបណា?" },
  },
  {
    km: "ការចុះបញ្ជីម៉ាកពាណិជ្ជកម្ម",
    en: "Trademark registration",
    ask: { en: "How do I register a trademark?", km: "តើខ្ញុំចុះបញ្ជីម៉ាកពាណិជ្ជកម្មដោយរបៀបណា?" },
  },
];

/* ── Channels ────────────────────────────────────────────────────────────── */

export const CHANNELS = {
  eyebrow: { en: "Channels", km: "បណ្តាញ" } satisfies Copy,
  title: {
    en: ["Ask wherever you ", "already", " are."],
    km: ["សួរនៅកន្លែងដែលអ្នក", "ប្រើប្រាស់រួចហើយ", "។"],
  } satisfies Headline,
  body: {
    en: "Most Cambodians live in Telegram and Messenger, so SuperAsk does too.",
    km: "ប្រជាជនកម្ពុជាភាគច្រើនប្រើ Telegram និង Messenger ដូច្នេះ SuperAsk ក៏នៅទីនោះដែរ។",
  } satisfies Copy,
  web: {
    label: { en: "Web", km: "គេហទំព័រ" },
    tag: { en: "Browser", km: "កម្មវិធីរុករក" },
    sub: {
      en: "Full experience on any device. No app required — just open and ask.",
      km: "បទពិសោធន៍ពេញលេញលើគ្រប់ឧបករណ៍។ មិនត្រូវការកម្មវិធី — គ្រាន់តែបើក ហើយសួរ។",
    },
    cta: { en: "Open SuperAsk Web", km: "បើក SuperAsk Web" },
  },
  telegram: {
    label: { en: "Telegram", km: "Telegram" },
    sub: {
      en: "Chat with our bot inside Telegram — the app most Cambodians already have.",
      km: "ជជែកជាមួយបូតរបស់យើងក្នុង Telegram — កម្មវិធីដែលប្រជាជនកម្ពុជាភាគច្រើនមានរួចហើយ។",
    },
    cta: { en: "Open in Telegram", km: "បើកក្នុង Telegram" },
  },
  messenger: {
    label: { en: "Messenger", km: "Messenger" },
    tag: { en: "Facebook", km: "Facebook" },
    sub: {
      en: "Message us on Facebook Messenger — same answers, same sources.",
      km: "ផ្ញើសារមកយើងតាម Facebook Messenger — ចម្លើយដូចគ្នា ប្រភពដូចគ្នា។",
    },
    cta: { en: "Open in Messenger", km: "បើកក្នុង Messenger" },
  },
};

/* ── Trust & safety ──────────────────────────────────────────────────────── */

export const TRUST = {
  eyebrow: { en: "Trust & safety", km: "ទំនុកចិត្ត និងសុវត្ថិភាព" } satisfies Copy,
  title: {
    en: ["If we don't have a ", "verified", " source, we say so."],
    km: ["បើយើងគ្មានប្រភព", "ដែលបានផ្ទៀងផ្ទាត់", " យើងនឹងប្រាប់អ្នក។"],
  } satisfies Headline,
  cards: [
    {
      icon: "shield",
      title: { en: "Never invented", km: "មិនដែលប្រឌិត" },
      body: {
        en: "We never make up a fee, a deadline, an office or a legal reference. If there's no approved source, we tell you instead of guessing.",
        km: "យើងមិនដែលប្រឌិតថ្លៃសេវា កាលកំណត់ ការិយាល័យ ឬឯកសារយោងច្បាប់ទេ។ បើគ្មានប្រភពដែលបានអនុម័ត យើងប្រាប់អ្នកជំនួសឱ្យការទាយ។",
      },
    },
    {
      icon: "lock",
      title: { en: "Nothing to give us", km: "មិនចាំបាច់ផ្តល់អ្វីឱ្យយើង" },
      body: {
        en: "Free, no registration, no personal data required. SuperAsk explains procedures — it does not access your records.",
        km: "ឥតគិតថ្លៃ មិនចាំបាច់ចុះឈ្មោះ មិនត្រូវការទិន្នន័យផ្ទាល់ខ្លួន។ SuperAsk ពន្យល់នីតិវិធី — វាមិនចូលមើលកំណត់ត្រារបស់អ្នកទេ។",
      },
    },
  ] as const,
};

/* ── About us (MOCK team + partners) ─────────────────────────────────────── */

export const ABOUT = {
  eyebrow: { en: "About us", km: "អំពីយើង" } satisfies Copy,
  title: {
    en: ["Built in Cambodia, for ", "Cambodians", "."],
    km: ["បង្កើតនៅកម្ពុជា សម្រាប់", "ប្រជាជនកម្ពុជា", "។"],
  } satisfies Headline,
  body: {
    en: "We built SuperAsk because finding out what a procedure needs still means a lost day, a wasted trip or a broker's fee. Our small team turns scattered official notices into clear, sourced answers — so every citizen, in any province, can get it right the first time.",
    km: "យើងបង្កើត SuperAsk ព្រោះការស្វែងយល់ពីនីតិវិធី នៅតែមានន័យថាបាត់បង់មួយថ្ងៃ ធ្វើដំណើរឥតប្រយោជន៍ ឬបង់ថ្លៃមេខ្យល់។ ក្រុមតូចរបស់យើងបំប្លែងសេចក្តីជូនដំណឹងផ្លូវការដែលរាយប៉ាយ ទៅជាចម្លើយច្បាស់លាស់មានឯកសារយោង — ដើម្បីឱ្យប្រជាពលរដ្ឋគ្រប់រូប នៅគ្រប់ខេត្ត អាចធ្វើបានត្រឹមត្រូវតាំងពីលើកដំបូង។",
  } satisfies Copy,
  team: [
    { name: "Sokha Chan", role: { en: "Co-founder & CEO", km: "សហស្ថាបនិក និងនាយកប្រតិបត្តិ" } },
    { name: "Dara Kim", role: { en: "Co-founder & CTO", km: "សហស្ថាបនិក និងនាយកបច្ចេកវិទ្យា" } },
    { name: "Sreymom Pich", role: { en: "Head of Policy & Content", km: "ប្រធានផ្នែកគោលនយោបាយ និងខ្លឹមសារ" } },
    { name: "Vannak Heng", role: { en: "Lead Engineer", km: "វិស្វករនាំមុខ" } },
    { name: "Bopha Long", role: { en: "Product Designer", km: "អ្នករចនាផលិតផល" } },
    { name: "Rithy Sok", role: { en: "Data & Partnerships", km: "ទិន្នន័យ និងភាពជាដៃគូ" } },
  ],
  partnersLabel: { en: "Partners & supporters", km: "ដៃគូ និងអ្នកគាំទ្រ" } satisfies Copy,
  partners: ["Mekong Civic Lab", "Khmer Open Data", "Angkor Digital Fund", "PP Startup Hub"],
};

/* ── FAQs ────────────────────────────────────────────────────────────────── */

export const FAQS = {
  eyebrow: { en: "FAQs", km: "សំណួរញឹកញាប់" } satisfies Copy,
  title: {
    en: ["Questions people ", "ask", " us."],
    km: ["សំណួរដែលប្រជាជន", "សួរ", "យើង។"],
  } satisfies Headline,
  items: [
    {
      q: { en: "Is SuperAsk an official government service?", km: "តើ SuperAsk ជាសេវារដ្ឋាភិបាលផ្លូវការឬ?" },
      a: {
        en: "SuperAsk is a prototype from the Digital Government Committee. It organises official public information so it's easy to find and understand — answers are informational and not legally binding.",
        km: "SuperAsk គឺជាគំរូសាកល្បងពីគណៈកម្មាធិការរដ្ឋាភិបាលឌីជីថល។ វារៀបចំព័ត៌មានសាធារណៈផ្លូវការឱ្យងាយស្វែងរក និងយល់ — ចម្លើយជាព័ត៌មានតែប៉ុណ្ណោះ មិនមានអានុភាពច្បាប់ទេ។",
      },
    },
    {
      q: { en: "Is it free?", km: "តើវាឥតគិតថ្លៃទេ?" },
      a: { en: "Yes, on every channel.", km: "បាទ/ចាស ឥតគិតថ្លៃលើគ្រប់បណ្តាញ។" },
    },
    {
      q: { en: "Which languages does it support?", km: "តើវាគាំទ្រភាសាអ្វីខ្លះ?" },
      a: { en: "Khmer and English.", km: "ភាសាខ្មែរ និងអង់គ្លេស។" },
    },
    {
      q: { en: "Where does the information come from?", km: "តើព័ត៌មានមកពីណា?" },
      a: {
        en: "Only from official ministry and public-institution channels that we've manually verified.",
        km: "តែពីបណ្តាញផ្លូវការរបស់ក្រសួង និងស្ថាប័នសាធារណៈ ដែលយើងបានផ្ទៀងផ្ទាត់ដោយផ្ទាល់ប៉ុណ្ណោះ។",
      },
    },
    {
      q: { en: "Can it check the status of my application?", km: "តើវាអាចពិនិត្យស្ថានភាពពាក្យស្នើសុំរបស់ខ្ញុំបានទេ?" },
      a: {
        en: "No. SuperAsk explains procedures; it does not access personal records.",
        km: "ទេ។ SuperAsk ពន្យល់នីតិវិធី វាមិនចូលមើលកំណត់ត្រាផ្ទាល់ខ្លួនទេ។",
      },
    },
    {
      q: { en: "What if SuperAsk can't answer?", km: "ចុះបើ SuperAsk មិនអាចឆ្លើយបាន?" },
      a: {
        en: "It tells you it has no verified source rather than guessing, and points you to the right office.",
        km: "វាប្រាប់អ្នកថាគ្មានប្រភពដែលបានផ្ទៀងផ្ទាត់ ជំនួសឱ្យការទាយ ហើយណែនាំអ្នកទៅការិយាល័យត្រឹមត្រូវ។",
      },
    },
  ],
};

/* ── Final CTA ───────────────────────────────────────────────────────────── */

export const CTA = {
  title: { en: "Get it right the first time.", km: "ធ្វើឱ្យត្រូវតាំងពីលើកដំបូង។" } satisfies Copy,
  body: {
    en: "Free, sourced, available wherever you are. Ask your first question now.",
    km: "ឥតគិតថ្លៃ មានឯកសារយោង និងប្រើបានគ្រប់ទីកន្លែង។ សួរសំណួរដំបូងរបស់អ្នកឥឡូវនេះ។",
  } satisfies Copy,
};

/* ── Footer ──────────────────────────────────────────────────────────────── */

export const FOOTER = {
  tagline: {
    en: "Free, sourced AI for Cambodian public services.",
    km: "AI ឥតគិតថ្លៃ មានឯកសារយោង សម្រាប់សេវាសាធារណៈកម្ពុជា។",
  } satisfies Copy,
  product: { en: "Product", km: "ផលិតផល" } satisfies Copy,
  company: { en: "Company", km: "ក្រុមហ៊ុន" } satisfies Copy,
  legal: { en: "Legal", km: "ផ្លូវច្បាប់" } satisfies Copy,
  contact: { en: "Contact", km: "ទំនាក់ទំនង" } satisfies Copy,
  productLinks: [
    { href: "/#how-it-works", label: { en: "How it works", km: "របៀបដំណើរការ" } },
    { href: "/#channels", label: { en: "Channels", km: "បណ្តាញ" } },
    { href: "/#examples", label: { en: "Examples", km: "ឧទាហរណ៍" } },
    { href: "/#faqs", label: { en: "FAQs", km: "សំណួរញឹកញាប់" } },
  ],
  companyLinks: [
    { href: "/#about", label: { en: "About us", km: "អំពីយើង" } },
    { href: "/login", label: { en: "Log in", km: "ចូលគណនី" } },
    { href: "/register", label: { en: "Create account", km: "បង្កើតគណនី" } },
  ],
  legalLinks: [
    { href: "#privacy", label: { en: "Privacy", km: "ឯកជនភាព" } },
    { href: "#terms", label: { en: "Terms", km: "លក្ខខណ្ឌ" } },
    { href: "#disclaimer", label: { en: "Disclaimer", km: "ការបដិសេធ" } },
  ],
  email: { en: "Email", km: "អ៊ីម៉ែល" } satisfies Copy,
  office: { en: "Office", km: "ការិយាល័យ" } satisfies Copy,
  officeVal: { en: "Phnom Penh, Cambodia", km: "រាជធានីភ្នំពេញ កម្ពុជា" } satisfies Copy,
  rights: {
    en: "© 2026 SuperAsk · Digital Government Committee. All rights reserved.",
    km: "© ២០២៦ SuperAsk · គណៈកម្មាធិការរដ្ឋាភិបាលឌីជីថល។ រក្សាសិទ្ធិគ្រប់យ៉ាង។",
  } satisfies Copy,
  notBinding: {
    en: "Answers are informational only and not legally binding.",
    km: "ចម្លើយជាព័ត៌មានតែប៉ុណ្ណោះ និងមិនមានអានុភាពច្បាប់។",
  } satisfies Copy,
};
