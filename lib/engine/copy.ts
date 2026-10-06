/**
 * Refusal and boundary copy used by the ask pipeline.
 *
 * Kept out of the orchestrator so the gate order in tiers.ts stays readable,
 * and so a wording change does not look like an engine change.
 */

import type { Lang } from "@/lib/types";
import { getKb } from "@/lib/kb/loader";

/**
 * Refusal copy for a question that is not about a government service at all.
 *
 * Says what SuperAsk is, not which ministries are loaded — the ministry list is
 * the wrong answer here and reads as "you picked the wrong ministry" to someone
 * who asked about translation or the weather.
 *
 * It does point at terminology, because §6.1 puts plain-language explanation of
 * official terms in scope: a citizen asking what a word in a government document
 * means is asking something SuperAsk can genuinely help with, and that is the
 * nearest real capability to a translation request.
 */
export function notAServiceQuestion(lang: Lang): string {
  if (lang === "km") {
    return [
      "SuperAsk ឆ្លើយតែសំណួរអំពីនីតិវិធីនៃសេវាសាធារណៈរបស់រដ្ឋាភិបាលកម្ពុជា — ជំហាន ឯកសារតម្រូវ ថ្លៃសេវា កំណត់ពេល និងការិយាល័យទទួលបន្ទុក។",
      "",
      "វាមិនអាចបកប្រែ ឆ្លើយសំណួរចំណេះដឹងទូទៅ ឬជួយការងារផ្សេងក្រៅពីនេះទេ។ វាឆ្លើយតែពីឯកសាររដ្ឋាភិបាលដែលបានអនុម័ត ដូច្នេះអ្វីដែលគ្មានក្នុងឯកសារទាំងនោះ វាមិនឆ្លើយឡើយ។",
      "",
      "អ្វីដែលវាអាចធ្វើបាន៖ ពន្យល់ន័យពាក្យជាផ្លូវការដែលប្រើក្នុងឯកសាររដ្ឋាភិបាល។ ឧទាហរណ៍ «តើ ប្រកាស មានន័យដូចម្តេច?»",
    ].join("\n");
  }

  return [
    "SuperAsk only answers questions about Cambodian government service procedures — the steps, required documents, official fees, timelines, and which office handles a case.",
    "",
    "It cannot translate, answer general knowledge questions, or act as a general assistant. It answers only from approved government documents, so anything not in those documents it does not answer at all.",
    "",
    "What it can do: explain what an official term in a government document means. For example, \"What does prakas mean?\"",
  ].join("\n");
}

/**
 * Refusal copy for a coverage gap.
 *
 * A refusal that only says "no" is a dead end, and a dead end is what makes a
 * service feel unusable even when it is behaving correctly. So it says what IS
 * covered — most citizens who hit this asked about a service that has not been
 * onboarded yet, and redirecting them costs nothing and saves an escalation.
 *
 * The coverage list is derived from the loaded corpus rather than hardcoded, so
 * it cannot drift out of date as ministries onboard.
 */
export function cannotAnswer(lang: Lang): string {
  const ministries = [
    ...new Set(getKb().chunks.filter((c) => !c.superseded).map((c) => c.ministry)),
  ];

  if (lang === "km") {
    return [
      "SuperAsk មិនមានឯកសារយោងដែលបានអនុម័តសម្រាប់សំណួរនេះទេ។ ជាជាងទាយ វានឹងមិនឆ្លើយឡើយ។",
      "",
      "បច្ចុប្បន្ន SuperAsk គ្របដណ្តប់លើ៖",
      ...ministries.map((m) => `• ${m}`),
      "",
      "ប្រសិនបើសំណួររបស់អ្នកស្ថិតក្នុងវិស័យទាំងនេះ សូមសាកសួរម្តងទៀតដោយប្រើពាក្យផ្សេង។ បើមិនមែនទេ មន្ត្រីអាចជួយអ្នកបាន។",
    ].join("\n");
  }

  return [
    "SuperAsk does not have an approved source that answers this. Rather than guess, it will not answer.",
    "",
    "Right now it covers:",
    ...ministries.map((m) => `• ${m}`),
    "",
    "If your question is in one of those areas, try asking it a different way. If it is not, an officer can help you.",
  ].join("\n");
}

/**
 * The citizen asked WHY, and the source gives the rule without a reason.
 *
 * This is the one refusal in the file that has to actively resist being helpful
 * in the wrong direction. The tempting reply is to restate the rule — SuperAsk
 * does have a source, the source is on the right subject, and repeating it
 * feels like answering. It is not: a citizen who asks why a late fee exists has
 * already been told what it is, and saying it again is what made them type "but
 * why though?" and get the same paragraph back.
 *
 * So it does three things and no more: names the distinction between the rule
 * and its reason, says SuperAsk will not invent the second, and offers both real
 * ways forward — the officer, who can speak to policy, and the rule question,
 * which SuperAsk genuinely can answer.
 */
export function reasonNotInSource(lang: Lang): string {
  if (lang === "km") {
    return [
      "អ្នកបានសួរថា ហេតុអ្វី។ នោះជាសំណួរផ្សេងពី «វិធានគឺជាអ្វី»។",
      "",
      "• SuperAsk មានឯកសារយោងដែលបានអនុម័តចែងអំពីវិធាននេះ",
      "• ប៉ុន្តែឯកសារនោះមិនបានផ្តល់មូលហេតុនៃវិធាននេះទេ",
      "• SuperAsk មិនបង្កើតមូលហេតុដែលគ្មាននៅក្នុងឯកសារយោងឡើយ — មូលហេតុដែលប្រឌិតឡើងសម្រាប់វិធានរបស់រដ្ឋាភិបាល អាក្រក់ជាងការមិនឆ្លើយ",
      "",
      "អ្វីដែលអាចជួយបាន៖",
      "• មន្ត្រីអាចពន្យល់អំពីគោលនយោបាយនៅពីក្រោយវិធាននេះ",
      "• បើអ្នកចង់ដឹងអំពីវិធានខ្លួនឯង — លក្ខខណ្ឌ ថ្លៃសេវា ឬពេលវេលាដែលវាអនុវត្ត — សូមសួរបែបនោះ ហើយ SuperAsk នឹងឆ្លើយពីឯកសារយោង",
    ].join("\n");
  }

  return [
    "You asked why. That is a different question from what the rule is.",
    "",
    "• SuperAsk has an approved source that sets out this rule",
    "• That source does not give a reason for it",
    "• SuperAsk does not supply reasons that are not in the source — an invented rationale for a government rule is worse than none",
    "",
    "What can help:",
    "• An officer can explain the policy behind it",
    "• If you want the rule itself — the conditions, the fee, or when it applies — ask for that and SuperAsk will answer it from the source",
  ].join("\n");
}

/**
 * The citizen asked about a NAMED business, mark, or case.
 *
 * SuperAsk holds published rules, not records. But both registers involved are
 * public and searchable, so the useful answer is not "no" — it is "not here,
 * there", with the addresses. This is the §6.2 boundary explained rather than
 * merely enforced.
 */
export function entityLookup(lang: Lang): string {
  if (lang === "km") {
    return [
      "SuperAsk មានវិធាន និងនីតិវិធីដែលបានផ្សាយ មិនមែនកំណត់ត្រារបស់អាជីវកម្មជាក់លាក់ណាមួយឡើយ។ វាមិនអាចប្រាប់ថាតើម៉ាក ឬក្រុមហ៊ុនណាមួយបានចុះបញ្ជីរួចឬនៅ អ្នកណាជាម្ចាស់ ឬស្ថានភាពជាយ៉ាងណានោះទេ។",
      "",
      "ព័ត៌មានទាំងនោះមាននៅក្នុងបញ្ជីសាធារណៈ៖",
      "• ការស្វែងរកម៉ាក — នាយកដ្ឋានកម្មសិទ្ធិបញ្ញា៖ https://digitalip.cambodiaip.gov.kh",
      "• ការចុះបញ្ជីអាជីវកម្ម — ក្រសួងពាណិជ្ជកម្ម៖ https://registrationservices.gov.kh",
      "",
      "ប្រសិនបើអ្នកចង់ដឹងអំពី *វិធាន* — ដូចជាម៉ាកបែបណាដែលអាចចុះបញ្ជីបាន ឬការផ្ទេរសិទ្ធិម៉ាកធ្វើដូចម្តេច — សូមសួរ ហើយ SuperAsk នឹងឆ្លើយពីឯកសារយោងជាផ្លូវការ។",
    ].join("\n");
  }

  return [
    "SuperAsk holds published rules and procedures, not records about individual businesses. It cannot tell you whether a particular mark or company is registered, who owns it, or what its status is.",
    "",
    "Those are public registers, and you can search them directly:",
    "• Trademark search — Department of Intellectual Property Rights: https://digitalip.cambodiaip.gov.kh",
    "• Business registration — Ministry of Commerce: https://registrationservices.gov.kh",
    "",
    "If you want the *rules* — which marks can be registered, how to transfer ownership of a mark — ask that and SuperAsk will answer from an official source.",
  ].join("\n");
}

export const SUPPRESSED: Record<Lang, string> = {
  en: "SuperAsk drafted an answer but could not confirm every detail against an approved source, so it has withheld it.\n\nAn officer can give you a confirmed answer.",
  km: "SuperAsk បានព្រាងចម្លើយមួយ ប៉ុន្តែមិនអាចផ្ទៀងផ្ទាត់រាល់ព័ត៌មានលម្អិតជាមួយឯកសារយោងដែលបានអនុម័តទេ ដូច្នេះវាបានទប់ចម្លើយនោះ។\n\nមន្ត្រីអាចផ្តល់ចម្លើយដែលបានផ្ទៀងផ្ទាត់ជូនអ្នក។",
};
