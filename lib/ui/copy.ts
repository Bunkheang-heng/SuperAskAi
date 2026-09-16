/**
 * Interface copy, bilingual.
 *
 * Kept in one file rather than inline so that a Khmer reviewer can read and
 * correct every string a citizen sees without touching component code, and so
 * that adding a language (Phase 2) is a data change.
 *
 * The Khmer here is prototype copy and needs review by a Khmer-speaking content
 * officer before any release.
 */

import type { Lang } from "@/lib/types";

type Copy = Record<Lang, string>;

/**
 * Appended to the body of an unverified answer by lib/engine/tiers.ts.
 *
 * It lives in the answer STRING, not only in the `unverified` flag, so that any
 * consumer of /api/ask that renders the answer and ignores the rest of the
 * payload still shows the citizen that nothing here is from an approved source.
 * This interface reads the flag and renders a proper banner instead, so
 * AnswerBlock strips this exact suffix before display — which is why it is
 * shared from here rather than defined privately in the engine.
 */
export const UNVERIFIED_NOTICE: Copy = {
  en: "⚠️ Not from an approved source. AskGov has no approved government document covering this, so the above is general guidance from the AI model — it may be incomplete, out of date, or wrong. Confirm any fee, deadline, document, or office with the responsible office before acting on it.",
  km: "⚠️ មិនមែនមកពីឯកសារយោងដែលបានអនុម័តទេ។ AskGov គ្មានឯកសាររដ្ឋាភិបាលដែលបានអនុម័តសម្រាប់ករណីនេះទេ ដូច្នេះខ្លឹមសារខាងលើគឺជាការណែនាំទូទៅពីម៉ូដែល AI — វាអាចមិនពេញលេញ ហួសសម័យ ឬខុស។ សូមផ្ទៀងផ្ទាត់ថ្លៃសេវា កំណត់ពេល ឯកសារ ឬការិយាល័យទទួលបន្ទុក ជាមួយការិយាល័យពាក់ព័ន្ធ មុននឹងអនុវត្ត។",
};

export const UI = {
  brandSub: {
    en: "Digital Government Committee",
    km: "គណៈកម្មាធិការរដ្ឋាភិបាលឌីជីថល",
  } satisfies Copy,

  newQuestion: { en: "New question", km: "សំណួរថ្មី" } satisfies Copy,

  tryAsking: { en: "Try asking", km: "សូមសាកសួរ" } satisfies Copy,

  history: { en: "Recent", km: "ថ្មីៗនេះ" } satisfies Copy,

  clearHistory: { en: "Clear", km: "សម្អាត" } satisfies Copy,

  clearHistoryConfirm: {
    en: "Delete all saved questions on this device?",
    km: "លុបសំណួរដែលបានរក្សាទុកទាំងអស់នៅលើឧបករណ៍នេះ?",
  } satisfies Copy,

  deleteOne: { en: "Delete", km: "លុប" } satisfies Copy,

  /** Coverage stated before the citizen asks, not discovered by refusal. */
  coversNow: {
    en: "Currently covers",
    km: "បច្ចុប្បន្នគ្របដណ្តប់លើ",
  } satisfies Copy,

  heroTitle: { en: "Ask the government.", km: "សួរទៅរដ្ឋាភិបាល" } satisfies Copy,

  heroBody: {
    en: "Procedures, documents, official fees, and which office handles your case. Every answer shows the official source it came from. AskGov does not handle personal cases and does not give legal advice.",
    km: "នីតិវិធី ឯកសារ ថ្លៃសេវាជាផ្លូវការ និងការិយាល័យទទួលបន្ទុកករណីរបស់អ្នក។ ចម្លើយនីមួយៗបង្ហាញឯកសារយោងជាផ្លូវការ។ AskGov មិនដោះស្រាយករណីផ្ទាល់ខ្លួន និងមិនផ្តល់ការប្រឹក្សាផ្នែកច្បាប់ឡើយ។",
  } satisfies Copy,

  placeholder: {
    en: "Ask your question",
    km: "សួរសំណួររបស់អ្នក",
  } satisfies Copy,

  send: { en: "Send", km: "ផ្ញើ" } satisfies Copy,

  working: { en: "Retrieving sources…", km: "កំពុងស្វែងរកឯកសារយោង…" } satisfies Copy,

  /** FR-65: displayed with every answer. */
  notBinding: {
    en: "Informational only. Not legally binding. Confirm with the responsible office before acting.",
    km: "ជាព័ត៌មានតែប៉ុណ្ណោះ។ មិនមានលក្ខណៈចងកាតព្វកិច្ចផ្នែកច្បាប់ទេ។ សូមផ្ទៀងផ្ទាត់ជាមួយការិយាល័យទទួលបន្ទុកមុននឹងអនុវត្ត។",
  } satisfies Copy,

  composerNote: {
    en: "AskGov answers only from approved government sources, and says so when it does not know.",
    km: "AskGov ឆ្លើយតែពីឯកសារយោងរដ្ឋាភិបាលដែលបានអនុម័ត ហើយប្រាប់នៅពេលវាមិនដឹង។",
  } satisfies Copy,

  /**
   * FR-66 — escalation presented as an explicit action.
   *
   * "Explicit" is satisfied by a visible, labelled control. It does not require
   * repeating the same three-line explanation under every escalated answer; a
   * citizen who reads the same paragraph four times stops reading it, and the
   * action it wraps gets ignored with it. So the action is always shown, and the
   * explanation is shown once per conversation.
   */
  connectOfficer: {
    en: "Ask an officer",
    km: "សួរមន្ត្រី",
  } satisfies Copy,

  /**
   * The unverified-answer banner (AskResponse.unverified).
   *
   * Sits ABOVE the answer, not below it. A citizen who reads the answer and
   * acts on it has already left the page by the time a footnote arrives; the
   * qualification has to reach them before the content it qualifies.
   */
  unverifiedLabel: {
    en: "Not from an approved source",
    km: "មិនមែនមកពីឯកសារយោងដែលបានអនុម័ត",
  } satisfies Copy,

  unverifiedBody: {
    en: "AskGov has no approved government document covering this. The answer below is general guidance from the AI model — confirm any fee, deadline, document, or office before acting on it.",
    km: "AskGov គ្មានឯកសាររដ្ឋាភិបាលដែលបានអនុម័តសម្រាប់ករណីនេះទេ។ ចម្លើយខាងក្រោមគឺជាការណែនាំទូទៅពីម៉ូដែល AI — សូមផ្ទៀងផ្ទាត់ថ្លៃសេវា កំណត់ពេល ឯកសារ ឬការិយាល័យ មុននឹងអនុវត្ត។",
  } satisfies Copy,

  /** The one-line reason, always shown next to the action. */
  escalateCompact: {
    en: "No approved source covers this.",
    km: "គ្មានឯកសារយោងដែលបានអនុម័តសម្រាប់ករណីនេះ។",
  } satisfies Copy,

  /**
   * Shown only on the first escalation of a conversation. Deliberately does not
   * promise that the officer will already have the conversation — see the
   * handover note in components/AnswerBlock.tsx.
   */
  escalateDetail: {
    en: "Opens a chat with DG Support on Telegram. Your question is sent with the request so the officer has the context.",
    km: "បើកការសន្ទនាជាមួយ DG Support នៅលើ Telegram។ សំណួររបស់អ្នកត្រូវផ្ញើជាមួយសំណើ ដើម្បីឱ្យមន្ត្រីមានបរិបទ។",
  } satisfies Copy,

  handoverFailed: {
    en: "Could not open the handover. Contact DG Support directly:",
    km: "មិនអាចបើកការបញ្ជូនបន្តបានទេ។ សូមទាក់ទង DG Support ដោយផ្ទាល់៖",
  } satisfies Copy,

  /**
   * FR-29. Retained because the requirement stands — the office block is
   * suppressed only while the directory holds placeholder contact details. See
   * supportOffice() in lib/engine/tiers.ts.
   */
  officeFallback: {
    en: "Responsible office",
    km: "ការិយាល័យទទួលបន្ទុក",
  } satisfies Copy,

  emergencyTitle: {
    en: "This conversation has ended",
    km: "ការសន្ទនានេះបានបញ្ចប់",
  } satisfies Copy,

  /** FR-67 */
  reportError: { en: "Report an error", km: "រាយការណ៍កំហុស" } satisfies Copy,

  reportTitle: {
    en: "Report an incorrect answer",
    km: "រាយការណ៍ចម្លើយមិនត្រឹមត្រូវ",
  } satisfies Copy,

  reportBody: {
    en: "This report goes to the content steward at the ministry that owns the cited source. Tell them what is wrong, if you can.",
    km: "របាយការណ៍នេះនឹងទៅដល់អ្នកទទួលបន្ទុកខ្លឹមសារនៅក្រសួងដែលជាម្ចាស់ឯកសារយោង។ សូមប្រាប់ថាអ្វីមិនត្រឹមត្រូវ ប្រសិនបើអ្នកអាច។",
  } satisfies Copy,

  reportPlaceholder: {
    en: "What is incorrect? (optional)",
    km: "អ្វីមិនត្រឹមត្រូវ? (មិនចាំបាច់)",
  } satisfies Copy,

  submit: { en: "Submit report", km: "ផ្ញើរបាយការណ៍" } satisfies Copy,
  cancel: { en: "Cancel", km: "បោះបង់" } satisfies Copy,

  reportThanks: {
    en: "Report sent to the responsible ministry steward.",
    km: "របាយការណ៍បានផ្ញើទៅអ្នកទទួលបន្ទុកក្រសួង។",
  } satisfies Copy,

  /** FR-64 badge labels. */
  verified: { en: "Verified", km: "បានផ្ទៀងផ្ទាត់" } satisfies Copy,
  reviewDue: { en: "Review due", km: "ដល់ពេលត្រួតពិនិត្យ" } satisfies Copy,
  stale: { en: "Past review date", km: "ហួសកាលបរិច្ឆេទត្រួតពិនិត្យ" } satisfies Copy,

  sourceOne: { en: "Source", km: "ឯកសារយោង" } satisfies Copy,
  sourceMany: { en: "Sources", km: "ឯកសារយោង" } satisfies Copy,

  openSource: { en: "Open document", km: "បើកឯកសារ" } satisfies Copy,

  effective: { en: "Effective", km: "មានប្រសិទ្ធភាព" } satisfies Copy,
  lastVerified: { en: "Last verified", km: "ផ្ទៀងផ្ទាត់ចុងក្រោយ" } satisfies Copy,

  /** FR-72 */
  trace: { en: "Trace", km: "ដាននៃចម្លើយ" } satisfies Copy,
  traceTitle: { en: "Answer trace", km: "ដាននៃចម្លើយ" } satisfies Copy,
  traceInternal: {
    en: "Internal view — DGC and ministry users only. Not shown to citizens.",
    km: "ទិដ្ឋភាពខាងក្នុង — សម្រាប់តែអ្នកប្រើ DGC និងក្រសួង។",
  } satisfies Copy,

  toggleSidebar: { en: "Toggle sidebar", km: "បិទបើករបារចំហៀង" } satisfies Copy,
  skipToComposer: {
    en: "Skip to question box",
    km: "ទៅកាន់ប្រអប់សំណួរ",
  } satisfies Copy,
} as const;

export const SUGGESTIONS: Array<{ en: string; km: string }> = [
  {
    en: "How do I renew my driving licence?",
    km: "តើខ្ញុំបន្តអាយុកាលប័ណ្ណបើកបរដោយរបៀបណា?",
  },
  {
    en: "What documents do I need for a birth certificate?",
    km: "ត្រូវការឯកសារអ្វីខ្លះសម្រាប់សំបុត្រកំណើត?",
  },
  {
    en: "My child's birth was never registered. What now?",
    km: "កំណើតកូនខ្ញុំមិនបានចុះបញ្ជី តើត្រូវធ្វើដូចម្តេច?",
  },
  {
    en: "What is the official fee and where do I pay it?",
    km: "តើថ្លៃសេវាជាផ្លូវការប៉ុន្មាន ហើយបង់នៅឯណា?",
  },
];
