/**
 * Marketing / auth surface copy. Khmer-first like FormKH; English toggle on the
 * shared header. Kept separate from chat UI strings so the citizen assistant
 * and the public site can evolve independently.
 */

export type Lang = "km" | "en";

export type Copy = { km: string; en: string };

export function t(copy: Copy, lang: Lang): string {
  return copy[lang];
}

export const MARKETING = {
  login: { km: "ចូលគណនី", en: "Log in" } satisfies Copy,
  register: { km: "បង្កើតគណនី", en: "Create account" } satisfies Copy,
  start: {
    km: "ចាប់ផ្តើមសួរសំណួរឥឡូវនេះ",
    en: "Start asking now",
  } satisfies Copy,
  askNow: { km: "សួរឥឡូវនេះ", en: "Ask now" } satisfies Copy,
  secondaryCta: {
    km: "សាកសួរដោយមិនចូលគណនី",
    en: "Try without an account",
  } satisfies Copy,
  previewQuestion: {
    km: "តើខ្ញុំបន្តអាយុកាលប័ណ្ណបើកបរដោយរបៀបណា?",
    en: "How do I renew my driving licence?",
  } satisfies Copy,
  previewAnswer: {
    km: "ការបន្តអាយុកាលធ្វើនៅការិយាល័យ MPWT ឬតាមប្រព័ន្ធអនឡាញ។ ត្រូវការអត្តសញ្ញាណប័ណ្ណ និងប័ណ្ណបើកបរចាស់។",
    en: "Renew at an MPWT office or online. Bring your ID card and current licence.",
  } satisfies Copy,
  previewSource: {
    km: "ប្រភព · ក្រសួងសាធារណការ និងដឹកជញ្ជូន",
    en: "Source · Ministry of Public Works and Transport",
  } satisfies Copy,
  heroTitleLead: {
    km: "សួរអំពីសេវាសាធារណៈ",
    en: "Ask about government services",
  } satisfies Copy,
  heroTitleAccent: {
    km: "ប្រកបដោយប្រភពផ្លូវការ រហ័ស និងងាយស្រួល",
    en: "sourced, fast, and easy to use",
  } satisfies Copy,
  heroBody: {
    km: "SuperAsk ឆ្លើយសំណួរអំពីនីតិវិធី ឯកសារតម្រូវ ថ្លៃសេវាជាផ្លូវការ និងការិយាល័យទទួលបន្ទុក។ ចម្លើយនីមួយៗបង្ហាញឯកសារយោងជាផ្លូវការ។",
    en: "SuperAsk answers questions about procedures, required documents, official fees, and which office handles your case. Every answer shows the official source it came from.",
  } satisfies Copy,
  usedBy: {
    km: "បម្រើប្រជាពលរដ្ឋ និងភ្នាក់ងាររដ្ឋាភិបាល",
    en: "Built for citizens and government agencies",
  } satisfies Copy,
  featuresTitle: {
    km: "លក្ខណៈពិសេសនៃ SuperAsk",
    en: "What SuperAsk gives you",
  } satisfies Copy,
  features: [
    {
      title: {
        km: "ចម្លើយពីឯកសារយោងផ្លូវការ",
        en: "Answers from official sources",
      },
      body: {
        km: "រាល់ចម្លើយភ្ជាប់ទៅឯកសាររដ្ឋាភិបាលដែលបានអនុម័ត — មិនមែនការទាយទេ។",
        en: "Every answer links to an approved government document — never a guess.",
      },
    },
    {
      title: { km: "នីតិវិធីច្បាស់លាស់", en: "Clear procedures" },
      body: {
        km: "ជំហាន ឯកសារតម្រូវ ថ្លៃសេវា កំណត់ពេល និងការិយាល័យទទួលបន្ទុក ក្នុងកន្លែងតែមួយ។",
        en: "Steps, documents, fees, timelines, and the responsible office in one place.",
      },
    },
    {
      title: { km: "ភាសាខ្មែរ និងអង់គ្លេស", en: "Khmer and English" },
      body: {
        km: "សួរ និងអានចម្លើយជាភាសាខ្មែរ ឬអង់គ្លេសតាមការជ្រើសរើសរបស់អ្នក។",
        en: "Ask and read answers in Khmer or English — whichever you prefer.",
      },
    },
    {
      title: { km: "ភ្ជាប់ទៅមន្ត្រី", en: "Connect to an officer" },
      body: {
        km: "នៅពេល SuperAsk មិនអាចឆ្លើយបាន វាភ្ជាប់អ្នកទៅមន្ត្រីដើម្បីជំនួយបន្ថែម។",
        en: "When SuperAsk cannot answer, it connects you to an officer for further help.",
      },
    },
    {
      title: { km: "គ្មានការប្រឹក្សាផ្នែកច្បាប់", en: "Not legal advice" },
      body: {
        km: "SuperAsk ផ្តល់ព័ត៌មានសេវាកម្មតែប៉ុណ្ណោះ — មិនមែនការសម្រេចចិត្តចងកាតព្វកិច្ចទេ។",
        en: "SuperAsk gives service information only — never a binding decision.",
      },
    },
    {
      title: { km: "ប្រវត្តិនៅលើឧបករណ៍", en: "History stays on your device" },
      body: {
        km: "សំណួររបស់អ្នករក្សាទុកនៅលើឧបករណ៍អ្នក — មិនត្រូវបានផ្ញើទៅម៉ាស៊ីនមេទេ។",
        en: "Your questions stay on your device — they are never sent to a history server.",
      },
    },
  ],
  howTitle: { km: "របៀបដំណើរការ", en: "How it works" } satisfies Copy,
  howBody: {
    km: "សួរសំណួរ អានចម្លើយពីឯកសារយោងផ្លូវការ ហើយបញ្ជាក់ជាមួយការិយាល័យទទួលបន្ទុកមុននឹងអនុវត្ត។",
    en: "Ask a question, read the answer from an official source, and confirm with the responsible office before you act.",
  } satisfies Copy,
  steps: [
    {
      title: { km: "ចូលគណនី", en: "Log in" },
      body: {
        km: "បង្កើតគណនី ឬចូល ដើម្បីចាប់ផ្តើមសួរ",
        en: "Create an account or log in to start asking",
      },
    },
    {
      title: { km: "សួរសំណួរ", en: "Ask your question" },
      body: {
        km: "សរសេរអំពីនីតិវិធី ឯកសារ ថ្លៃសេវា ឬការិយាល័យ",
        en: "Write about a procedure, document, fee, or office",
      },
    },
    {
      title: { km: "អានចម្លើយ", en: "Read the answer" },
      body: {
        km: "មើលចម្លើយ រួមជាមួយឯកសារយោងផ្លូវការ",
        en: "See the answer together with the official source",
      },
    },
    {
      title: { km: "បញ្ជាក់មុនអនុវត្ត", en: "Confirm before acting" },
      body: {
        km: "ផ្ទៀងផ្ទាត់ជាមួយការិយាល័យទទួលបន្ទុក",
        en: "Verify with the office that handles your case",
      },
    },
  ],
  trustTitle: {
    km: "ព័ត៌មានពីប្រភពផ្លូវការ",
    en: "Information from official sources",
  } satisfies Copy,
  trustBody: {
    km: "SuperAsk ឆ្លើយតែពីឯកសាររដ្ឋាភិបាលដែលបានអនុម័ត ហើយប្រាប់នៅពេលវាមិនដឹង។ វាមិនដោះស្រាយករណីបុគ្គល និងមិនផ្តល់ការប្រឹក្សាផ្នែកច្បាប់ឡើយ។",
    en: "SuperAsk answers only from approved government documents, and says so when it does not know. It does not handle individual cases and does not give legal advice.",
  } satisfies Copy,
  ctaTitle: {
    km: "ចាប់ផ្តើមសួរសំណួររបស់អ្នកឥឡូវនេះ",
    en: "Start asking your question now",
  } satisfies Copy,
  builtBy: { km: "បង្កើតដោយ", en: "Built by" } satisfies Copy,
  contact: { km: "ទំនាក់ទំនង", en: "Contact" } satisfies Copy,
  privacy: { km: "ឯកជនភាព", en: "Privacy" } satisfies Copy,
  terms: { km: "លក្ខខណ្ឌប្រើប្រាស់", en: "Terms of use" } satisfies Copy,
  copyright: {
    km: "© 2026 គណៈកម្មាធិការរដ្ឋាភិបាលឌីជីថល",
    en: "© 2026 Digital Government Committee",
  } satisfies Copy,
  dgc: {
    km: "គណៈកម្មាធិការរដ្ឋាភិបាលឌីជីថល",
    en: "Digital Government Committee",
  } satisfies Copy,
  address: {
    km: "អគារលេខ១៣ មហាវិថីព្រះមុនីវង្ស សង្កាត់ស្រះចក ខណ្ឌដូនពេញ រាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា ១២០២១០",
    en: "Building No. 13, Preah Monivong Blvd, Sangkat Srah Chak, Khan Daun Penh, Phnom Penh, Cambodia 120210",
  } satisfies Copy,
  email: "info@superask.kh",

  // Auth
  loginHeadline: {
    km: "សួរអំពីសេវាសាធារណៈប្រកបដោយប្រភពផ្លូវការ",
    en: "Ask about government services with official sources",
  } satisfies Copy,
  loginHint: {
    km: "ចូលគណនី SuperAsk របស់អ្នក",
    en: "Log in to your SuperAsk account",
  } satisfies Copy,
  registerHeadline: {
    km: "បង្កើតគណនី SuperAsk",
    en: "Create your SuperAsk account",
  } satisfies Copy,
  registerHint: {
    km: "បំពេញព័ត៌មានខាងក្រោមដើម្បីចាប់ផ្តើម",
    en: "Fill in the details below to get started",
  } satisfies Copy,
  emailLabel: { km: "អាសយដ្ឋានអ៊ីម៉ែល", en: "Email address" } satisfies Copy,
  emailPlaceholder: {
    km: "ឧ. sokha@email.com",
    en: "e.g. sokha@email.com",
  } satisfies Copy,
  passwordLabel: { km: "ពាក្យសម្ងាត់", en: "Password" } satisfies Copy,
  passwordPlaceholder: {
    km: "យ៉ាងហោចណាស់ ៨ តួអក្សរ",
    en: "At least 8 characters",
  } satisfies Copy,
  confirmLabel: {
    km: "បញ្ជាក់ពាក្យសម្ងាត់",
    en: "Confirm password",
  } satisfies Copy,
  nameLabel: { km: "ឈ្មោះ", en: "Full name" } satisfies Copy,
  namePlaceholder: { km: "ឧ. សុខា", en: "e.g. Sokha" } satisfies Copy,
  noAccount: {
    km: "មិនទាន់មានគណនីទេ?",
    en: "Don't have an account?",
  } satisfies Copy,
  hasAccount: {
    km: "មានគណនីរួចហើយ?",
    en: "Already have an account?",
  } satisfies Copy,
  continueGuest: {
    km: "បន្តដោយមិនចូលគណនី",
    en: "Continue without an account",
  } satisfies Copy,
} as const;
