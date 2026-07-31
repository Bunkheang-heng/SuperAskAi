/**
 * Provider smoke test.
 *
 * Calls the configured provider once, with a fixed synthetic source block, and
 * checks that what comes back satisfies the answer contract. This is not an
 * evaluation — npm run eval measures retrieval, and the golden question set
 * measures answer quality. This answers a narrower question: is the credential
 * good, is the model id real, and does this model return parseable JSON that
 * honours the grounding rules?
 *
 * That last part matters when swapping model families. Section 10.6 condition 6
 * requires prompt templates to be revalidated against a new family, and the
 * cheapest first signal is whether the model cites at all and whether it invents
 * a fee that is not in the sources.
 *
 * Run: npm run smoke
 */

import { generate, PROMPT_VERSION } from "../lib/llm";
import { describeProvider } from "../lib/llm";

/**
 * Two sources and two probes. The first probe is answerable from the sources.
 * The second is not, and a model that answers it anyway — rather than escalating
 * — has failed rule 2, which is the failure mode that matters most here.
 */
const SOURCES = [
  {
    id: "SMOKE-1",
    header: "National ID card — replacement of a lost card",
    text: "To replace a lost national identity card, the applicant reports the loss at the commune or sangkat administration and submits the loss declaration together with a copy of the family record book. The replacement is issued by the district administration.",
    textKm:
      "ដើម្បីជំនួសអត្តសញ្ញាណប័ណ្ណជាតិដែលបាត់ អ្នកស្នើសុំត្រូវរាយការណ៍ការបាត់នៅរដ្ឋបាលឃុំ សង្កាត់ ហើយដាក់សេចក្តីប្រកាសបាត់ ជាមួយនឹងច្បាប់ចម្លងសៀវភៅគ្រួសារ។",
  },
  {
    id: "SMOKE-2",
    header: "National ID card — processing time",
    text: "The district administration issues the replacement card within thirty working days of receiving a complete application.",
  },
];

const PROBES = [
  {
    label: "answerable",
    question: "I lost my national ID card. What do I do?",
    lang: "en" as const,
    expectEscalate: false,
  },
  {
    label: "not-in-sources (must escalate)",
    question: "How much does it cost to replace a lost national ID card?",
    lang: "en" as const,
    expectEscalate: true,
  },
  {
    label: "khmer",
    question: "ខ្ញុំបាត់អត្តសញ្ញាណប័ណ្ណ តើត្រូវធ្វើដូចម្តេច?",
    lang: "km" as const,
    expectEscalate: false,
  },
];

async function main() {
  const info = describeProvider();

  console.log(`provider   ${info.id}`);
  console.log(`model      ${info.model}`);
  console.log(`hosting    ${info.hosting}`);
  console.log(`residency  ${info.residency}`);
  console.log(`prompt     ${PROMPT_VERSION}`);
  if (info.note) console.log(`note       ${info.note}`);
  console.log("");

  let failures = 0;

  for (const probe of PROBES) {
    const started = Date.now();
    const out = await generate({
      question: probe.question,
      lang: probe.lang,
      sources: SOURCES,
      history: [],
    });
    const ms = Date.now() - started;

    // A fallback means the configured provider threw. That is the single most
    // important thing this script can tell you, so it is never buried.
    if (out.fallbackReason) {
      failures++;
      console.log(`FAIL  ${probe.label}  (${ms}ms)`);
      console.log(`      degraded to extraction: ${out.fallbackReason}`);
      console.log("");
      continue;
    }

    const escalateOk = out.shouldEscalate === probe.expectEscalate;
    // Rule 3: no figure that is not in the sources. Thirty is the only number
    // the sources contain, so any other figure is fabricated.
    //
    // Ordered-list markers ("1.", "2)", Khmer "១.") are stripped first — they
    // are formatting, not claims, and models number their steps constantly.
    // Khmer digits are folded to Latin so that ៣០ counts as thirty rather than
    // reading as an invented figure (FR-08 answers are written in Khmer script).
    const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";
    const normalised = out.answer
      .replace(/(^|[\n\s])[\d០-៩]+[.)]\s/g, "$1")
      .replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));
    const invented = (normalised.match(/\b\d[\d,.]*\b/g) ?? []).filter(
      (n) => !["30", "thirty"].includes(n.toLowerCase().replace(/\.$/, "")),
    );

    if (!escalateOk || invented.length) failures++;

    console.log(`${!escalateOk || invented.length ? "WARN" : "ok  "}  ${probe.label}  (${ms}ms)`);
    console.log(`      confidence ${out.confidence}  escalate ${out.shouldEscalate}  citations [${out.citations.join(", ")}]`);
    if (!escalateOk) {
      console.log(`      expected escalate=${probe.expectEscalate}`);
    }
    if (invented.length) {
      console.log(`      figures not present in sources: ${invented.join(", ")}`);
    }
    console.log(`      ${out.answer.replace(/\s+/g, " ").slice(0, 220)}`);
    console.log("");
  }

  if (failures) {
    console.log(`${failures} probe(s) need review before this model is used.`);
    process.exit(1);
  }
  console.log("All probes passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
