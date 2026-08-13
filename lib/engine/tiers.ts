/**
 * The three-tier answer engine (PRD section 10.2).
 *
 *   Tier 1  Human-approved curated answer, served verbatim.   50–70% at maturity
 *   Tier 2  Retrieval augmented generation over the corpus.    25–45%
 *   Tier 3  Refusal and escalation to a human agent.            5–10%
 *
 * The order of operations is the safety design, not an implementation detail:
 *
 *   guardrail screen → curated match → retrieval → confidence gate →
 *   generation → verification gate → output moderation → citation assembly
 *
 * Guardrails run BEFORE retrieval, so an out-of-scope question never reaches a
 * model at all. The confidence gate runs BEFORE generation, so weak retrieval
 * escalates instead of producing a fluent answer over irrelevant sources —
 * which is the failure mode section 13 explicitly calls worse than no service.
 * The verification gate runs AFTER generation and can still suppress an answer
 * that has already been written.
 */

import { randomUUID } from "node:crypto";
import type {
  AskRequest,
  AskResponse,
  Citation,
  Confidence,
  Diagnostics,
  Lang,
  Tier,
} from "@/lib/types";
import { detectLang } from "@/lib/lang/detect";
// Carried in the answer body, not only in the interface chrome — see the note
// on the constant in lib/ui-copy.ts.
import { UNVERIFIED_NOTICE } from "@/lib/ui-copy";
import { retrieve } from "@/lib/retrieval";
import { getKb } from "@/lib/kb/loader";
import { generate, PROMPT_VERSION, GENERAL_PROMPT_VERSION } from "@/lib/llm";
import { matchCurated } from "./curated";
import { matchGlossary } from "./glossary";
import { assess, looksLikeEntityLookup } from "./topicality";
import {
  screen,
  moderateOutput,
  isOffDomain,
  type GuardrailHit,
} from "./guardrails";
import { verify } from "./verify";
import { freshnessOf, STALE_NOTICE } from "./freshness";
import { rationaleGap } from "./rationale";

const CURATED_THRESHOLD = Number(
  process.env.CURATED_MATCH_THRESHOLD ?? "0.72",
);
/**
 * Escalation floor (FR-16). Derived from the sweep in scripts/eval.ts against
 * the golden set, not chosen by feel: at 0.20 the starter set answers 91.2% of
 * in-scope questions and refuses 100% of out-of-scope ones. Re-derive whenever
 * the corpus, the segmenter, or the reranker changes.
 */
const RETRIEVAL_MIN_SCORE = Number(process.env.RETRIEVAL_MIN_SCORE ?? "0.20");

/**
 * Unsourced fallback — the operator switch on section 13's core trade-off.
 *
 * OFF (`GENERAL_FALLBACK_ENABLED=false`) is the PRD behaviour: no approved
 * source, no answer. ON lets the model answer a coverage gap from its own
 * knowledge, labelled unverified, with the officer still offered.
 *
 * It is ON by default in this build because the corpus is four ministries of
 * sample content and refusing everything outside it made the service read as
 * broken. That reasoning expires as coverage grows: the wider the corpus, the
 * more likely a question that misses it is one that genuinely should not be
 * answered, and the more a citizen has learned to trust what AskGov says.
 * Revisit this default before public release — NFR-11 and section 13 both
 * assume the strict behaviour.
 *
 * What it does NOT loosen: the §12 policy guardrails, the off-domain screen,
 * the entity-lookup boundary, and — for any answer that DOES have sources —
 * the verification gate. Those all still run first and unchanged.
 */
const GENERAL_FALLBACK_ENABLED =
  (process.env.GENERAL_FALLBACK_ENABLED ?? "true").toLowerCase() !== "false";


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
/**
 * Refusal copy for a question that is not about a government service at all.
 *
 * Says what AskGov is, not which ministries are loaded — the ministry list is
 * the wrong answer here and reads as "you picked the wrong ministry" to someone
 * who asked about translation or the weather.
 *
 * It does point at terminology, because §6.1 puts plain-language explanation of
 * official terms in scope: a citizen asking what a word in a government document
 * means is asking something AskGov can genuinely help with, and that is the
 * nearest real capability to a translation request.
 */
function notAServiceQuestion(lang: Lang): string {
  if (lang === "km") {
    return [
      "AskGov ឆ្លើយតែសំណួរអំពីនីតិវិធីនៃសេវាសាធារណៈរបស់រដ្ឋាភិបាលកម្ពុជា — ជំហាន ឯកសារតម្រូវ ថ្លៃសេវា កំណត់ពេល និងការិយាល័យទទួលបន្ទុក។",
      "",
      "វាមិនអាចបកប្រែ ឆ្លើយសំណួរចំណេះដឹងទូទៅ ឬជួយការងារផ្សេងក្រៅពីនេះទេ។ វាឆ្លើយតែពីឯកសាររដ្ឋាភិបាលដែលបានអនុម័ត ដូច្នេះអ្វីដែលគ្មានក្នុងឯកសារទាំងនោះ វាមិនឆ្លើយឡើយ។",
      "",
      "អ្វីដែលវាអាចធ្វើបាន៖ ពន្យល់ន័យពាក្យជាផ្លូវការដែលប្រើក្នុងឯកសាររដ្ឋាភិបាល។ ឧទាហរណ៍ «តើ ប្រកាស មានន័យដូចម្តេច?»",
    ].join("\n");
  }

  return [
    "AskGov only answers questions about Cambodian government service procedures — the steps, required documents, official fees, timelines, and which office handles a case.",
    "",
    "It cannot translate, answer general knowledge questions, or act as a general assistant. It answers only from approved government documents, so anything not in those documents it does not answer at all.",
    "",
    "What it can do: explain what an official term in a government document means. For example, \"What does prakas mean?\"",
  ].join("\n");
}

function cannotAnswer(lang: Lang): string {
  const ministries = [
    ...new Set(getKb().chunks.filter((c) => !c.superseded).map((c) => c.ministry)),
  ];

  if (lang === "km") {
    return [
      "AskGov មិនមានឯកសារយោងដែលបានអនុម័តសម្រាប់សំណួរនេះទេ។ ជាជាងទាយ វានឹងមិនឆ្លើយឡើយ។",
      "",
      "បច្ចុប្បន្ន AskGov គ្របដណ្តប់លើ៖",
      ...ministries.map((m) => `• ${m}`),
      "",
      "ប្រសិនបើសំណួររបស់អ្នកស្ថិតក្នុងវិស័យទាំងនេះ សូមសាកសួរម្តងទៀតដោយប្រើពាក្យផ្សេង។ បើមិនមែនទេ មន្ត្រីអាចជួយអ្នកបាន។",
    ].join("\n");
  }

  return [
    "AskGov does not have an approved source that answers this. Rather than guess, it will not answer.",
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
 * in the wrong direction. The tempting reply is to restate the rule — AskGov
 * does have a source, the source is on the right subject, and repeating it
 * feels like answering. It is not: a citizen who asks why a late fee exists has
 * already been told what it is, and saying it again is what made them type "but
 * why though?" and get the same paragraph back.
 *
 * So it does three things and no more: names the distinction between the rule
 * and its reason, says AskGov will not invent the second, and offers both real
 * ways forward — the officer, who can speak to policy, and the rule question,
 * which AskGov genuinely can answer.
 */
function reasonNotInSource(lang: Lang): string {
  if (lang === "km") {
    return [
      "អ្នកបានសួរថា ហេតុអ្វី។ នោះជាសំណួរផ្សេងពី «វិធានគឺជាអ្វី»។",
      "",
      "• AskGov មានឯកសារយោងដែលបានអនុម័តចែងអំពីវិធាននេះ",
      "• ប៉ុន្តែឯកសារនោះមិនបានផ្តល់មូលហេតុនៃវិធាននេះទេ",
      "• AskGov មិនបង្កើតមូលហេតុដែលគ្មាននៅក្នុងឯកសារយោងឡើយ — មូលហេតុដែលប្រឌិតឡើងសម្រាប់វិធានរបស់រដ្ឋាភិបាល អាក្រក់ជាងការមិនឆ្លើយ",
      "",
      "អ្វីដែលអាចជួយបាន៖",
      "• មន្ត្រីអាចពន្យល់អំពីគោលនយោបាយនៅពីក្រោយវិធាននេះ",
      "• បើអ្នកចង់ដឹងអំពីវិធានខ្លួនឯង — លក្ខខណ្ឌ ថ្លៃសេវា ឬពេលវេលាដែលវាអនុវត្ត — សូមសួរបែបនោះ ហើយ AskGov នឹងឆ្លើយពីឯកសារយោង",
    ].join("\n");
  }

  return [
    "You asked why. That is a different question from what the rule is.",
    "",
    "• AskGov has an approved source that sets out this rule",
    "• That source does not give a reason for it",
    "• AskGov does not supply reasons that are not in the source — an invented rationale for a government rule is worse than none",
    "",
    "What can help:",
    "• An officer can explain the policy behind it",
    "• If you want the rule itself — the conditions, the fee, or when it applies — ask for that and AskGov will answer it from the source",
  ].join("\n");
}

/**
 * The citizen asked about a NAMED business, mark, or case.
 *
 * AskGov holds published rules, not records. But both registers involved are
 * public and searchable, so the useful answer is not "no" — it is "not here,
 * there", with the addresses. This is the §6.2 boundary explained rather than
 * merely enforced.
 */
function entityLookup(lang: Lang): string {
  if (lang === "km") {
    return [
      "AskGov មានវិធាន និងនីតិវិធីដែលបានផ្សាយ មិនមែនកំណត់ត្រារបស់អាជីវកម្មជាក់លាក់ណាមួយឡើយ។ វាមិនអាចប្រាប់ថាតើម៉ាក ឬក្រុមហ៊ុនណាមួយបានចុះបញ្ជីរួចឬនៅ អ្នកណាជាម្ចាស់ ឬស្ថានភាពជាយ៉ាងណានោះទេ។",
      "",
      "ព័ត៌មានទាំងនោះមាននៅក្នុងបញ្ជីសាធារណៈ៖",
      "• ការស្វែងរកម៉ាក — នាយកដ្ឋានកម្មសិទ្ធិបញ្ញា៖ https://digitalip.cambodiaip.gov.kh",
      "• ការចុះបញ្ជីអាជីវកម្ម — ក្រសួងពាណិជ្ជកម្ម៖ https://registrationservices.gov.kh",
      "",
      "ប្រសិនបើអ្នកចង់ដឹងអំពី *វិធាន* — ដូចជាម៉ាកបែបណាដែលអាចចុះបញ្ជីបាន ឬការផ្ទេរសិទ្ធិម៉ាកធ្វើដូចម្តេច — សូមសួរ ហើយ AskGov នឹងឆ្លើយពីឯកសារយោងជាផ្លូវការ។",
    ].join("\n");
  }

  return [
    "AskGov holds published rules and procedures, not records about individual businesses. It cannot tell you whether a particular mark or company is registered, who owns it, or what its status is.",
    "",
    "Those are public registers, and you can search them directly:",
    "• Trademark search — Department of Intellectual Property Rights: https://digitalip.cambodiaip.gov.kh",
    "• Business registration — Ministry of Commerce: https://registrationservices.gov.kh",
    "",
    "If you want the *rules* — which marks can be registered, how to transfer ownership of a mark — ask that and AskGov will answer from an official source.",
  ].join("\n");
}

const SUPPRESSED = {
  en: "AskGov drafted an answer but could not confirm every detail against an approved source, so it has withheld it.\n\nAn officer can give you a confirmed answer.",
  km: "AskGov បានព្រាងចម្លើយមួយ ប៉ុន្តែមិនអាចផ្ទៀងផ្ទាត់រាល់ព័ត៌មានលម្អិតជាមួយឯកសារយោងដែលបានអនុម័តទេ ដូច្នេះវាបានទប់ចម្លើយនោះ។\n\nមន្ត្រីអាចផ្តល់ចម្លើយដែលបានផ្ទៀងផ្ទាត់ជូនអ្នក។",
};

function toCitation(
  chunk: Parameters<typeof freshnessOf>[0],
  lang: Lang,
): Citation {
  return {
    id: chunk.id,
    ministry: chunk.ministry,
    ministryKm: chunk.ministryKm,
    doc: chunk.doc,
    instrument: chunk.instrument,
    article: chunk.article,
    url: chunk.url,
    effective: chunk.effective,
    verified: chunk.verified,
    reviewDue: chunk.reviewDue,
    freshness: freshnessOf(chunk),
    quote: lang === "km" && chunk.textKm ? chunk.textKm : chunk.text,
  };
}

/**
 * FR-29 — responsible office contact details where human handover is
 * unavailable. Still returned in the payload; the interface currently surfaces
 * the DG Support handover instead of rendering a block of placeholder numbers.
 */
function supportOffice() {
  const { support } = getKb();
  return {
    name: support.name,
    address: support.address,
    hours: support.hours,
    phone: support.phone,
  };
}

export async function ask(req: AskRequest): Promise<AskResponse> {
  const started = performance.now();
  const id = randomUUID();
  const history = req.history ?? [];
  const question = req.question.trim();
  const lang = detectLang(question);
  /**
   * FR-72 / FR-73: the answer trace is for DGC and ministry users, not
   * citizens. This is opt-IN — set DIAGNOSTICS_ENABLED=true to expose it.
   *
   * It previously defaulted to on (`!== "false"`), which meant the default
   * build shipped the citizen a "Trace" control and a latency readout. A
   * requirement that says "internal users only" is not satisfied by a flag an
   * operator has to remember to turn off; the safe state has to be the default,
   * or the one deployment where nobody set the variable is a disclosure.
   */
  const diagnosticsEnabled = process.env.DIAGNOSTICS_ENABLED === "true";

  const baseDiagnostics = (over: Partial<Diagnostics>): Diagnostics => ({
    tier: 3,
    provider: "n/a",
    model: "n/a",
    hosting: "n/a",
    residency: "n/a",
    promptVersion: PROMPT_VERSION,
    detectedLang: lang,
    normalisedQuery: question,
    segments: [],
    expandedTerms: [],
    candidates: [],
    confidence: "low",
    verification: { passed: true, unsupported: [] },
    latencyMs: Math.round(performance.now() - started),
    ...over,
  });

  const finish = (res: AskResponse, diag: Diagnostics): AskResponse => ({
    ...res,
    diagnostics: diagnosticsEnabled
      ? { ...diag, latencyMs: Math.round(performance.now() - started) }
      : undefined,
  });

  // ── Guardrails, before any retrieval or model call (section 12) ───────────
  const hit: GuardrailHit | null = screen(question);
  if (hit) {
    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: hit.message[lang],
        citations: [],
        // An emergency terminates the interaction rather than escalating it.
        escalate: !hit.terminal,
        terminal: hit.terminal,
        office: hit.terminal ? undefined : supportOffice(),
      },
      baseDiagnostics({ tier: 3, refusalReason: `policy:${hit.kind}` }),
    );
  }

  // ── Tier 1: curated answer, no generation (FR-10, FR-11) ─────────────────
  const curated = matchCurated(question, lang, CURATED_THRESHOLD);
  if (curated) {
    return finish(
      {
        id,
        tier: 1,
        lang,
        answer: curated.answer,
        citations: [],
        escalate: false,
      },
      baseDiagnostics({
        tier: 1,
        provider: "curated",
        model: `${curated.id} (match ${curated.score.toFixed(2)})`,
        hosting: "In-process",
        residency: "Cambodia",
        confidence: "high",
      }),
    );
  }

  // ── Off-domain screen, before retrieval (§6.1) ───────────────────────────
  //
  // Whether a question is a government-service question at all is a scope
  // decision, and scope does not depend on what the corpus happens to score.
  // This used to sit inside the confidence gate, where it was only consulted if
  // retrieval came back below the floor — so "what is the capital of france",
  // which matches a vehicle-registration passage at 0.205 against a floor of
  // 0.20, walked straight past it into generation. Whether the citizen then got
  // a refusal depended on the model's own judgement: Claude declined, GPT
  // sometimes answered "Paris". A scope rule that holds only on some model
  // families is not a scope rule.
  //
  // OFF_DOMAIN matches only unmistakable non-service requests and lets anything
  // ambiguous fall through, so running it earlier costs no legitimate question —
  // and saves a retrieval and a model call on the ones it catches.
  if (isOffDomain(question, history)) {
    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: notAServiceQuestion(lang),
        citations: [],
        // No officer: sending someone to a government desk because they asked
        // for the weather wastes their time and the officer's.
        escalate: false,
      },
      baseDiagnostics({ tier: 3, refusalReason: "scope:not_a_service_question" }),
    );
  }

  // ── Retrieval ────────────────────────────────────────────────────────────
  const { query, candidates, topScore } = retrieve(question, history);

  const diagCandidates = candidates.map((c) => ({
    id: c.chunk.id,
    lexical: Number(c.lexical.toFixed(3)),
    dense: Number(c.dense.toFixed(3)),
    fused: Number(c.fused.toFixed(3)),
    rerank: Number(c.rerank.toFixed(3)),
    cited: false,
  }));

  const retrievalDiag = {
    normalisedQuery: query.normalised,
    segments: query.segments,
    expandedTerms: query.expanded,
    rewrittenQuery: query.rewritten,
    candidates: diagCandidates,
  };

  /**
   * Unsourced fallback (GENERAL_FALLBACK_ENABLED). Returns null when it is off,
   * when no model is available, or when the model itself declines — every one
   * of which means the caller should carry on to its refusal.
   *
   * Two callers, because there are two ways to arrive at "no approved source
   * answers this". Retrieval can find nothing above the floor, or it can find
   * something plausible that turns out not to answer the question, which the
   * grounded generation reports by escalating. The second is the common one on
   * a follow-up turn: history pulls the rewritten query toward whatever the
   * corpus does cover, so the passport question retrieves driving-licence
   * provisions and lands here rather than below the floor.
   */
  async function tryGeneralFallback(): Promise<AskResponse | null> {
    if (!GENERAL_FALLBACK_ENABLED) return null;

    /*
      The scope screens belong here rather than at each call site, because they
      were at one call site and not the other and both leaked immediately:
      "what is the capital of France" came back as "Paris is the capital of
      France" — AskGov answering as a general assistant, which §6.1 says it is
      not — and a trademark lookup got an invented office location and search
      fee in place of the §6.2 copy that names the real public registers.

      A coverage gap is the only thing this fallback is for. Out of scope stays
      out of scope however thin the corpus is.
    */
    if (isOffDomain(question, history) || looksLikeEntityLookup(question))
      return null;

    const general = await generate({
      question: query.normalised,
      lang,
      sources: [],
      history,
      mode: "general",
    });

    // Rule 5 of the general prompt tells the model to decline rather than guess
    // at a procedure it does not know, so a decline is a real signal, not a
    // formality. An extractive degradation lands here too, and must not be
    // dressed up as an unverified answer.
    if (!general.answer || general.shouldEscalate) return null;

    return finish(
      {
        id,
        tier: 2,
        lang,
        answer: `${general.answer}\n\n${UNVERIFIED_NOTICE[lang]}`,
        // Never any: an unsourced answer with a citation would be a fabricated
        // government reference.
        citations: [],
        // Still offered. The officer is the path to a confirmed answer, and
        // that matters more here than after a sourced one.
        escalate: true,
        office: supportOffice(),
        unverified: true,
      },
      baseDiagnostics({
        tier: 2,
        ...retrievalDiag,
        provider: general.provider.id,
        model: general.provider.model,
        hosting: general.provider.hosting,
        residency: general.provider.residency,
        providerFallback: general.fallbackReason,
        promptVersion: GENERAL_PROMPT_VERSION,
        // Nothing was verified against a source, so the verification gate did
        // not run. Reporting passed:true would misread as "checked".
        verification: { passed: false, unsupported: ["(unsourced answer)"] },
        confidence: "low",
        refusalReason: "fallback:general_knowledge",
      }),
    );
  }

  // ── Confidence gate: escalate rather than generate over weak sources ─────
  // FR-16. This runs before generation on purpose (section 13).
  if (candidates.length === 0 || topScore < RETRIEVAL_MIN_SCORE) {
    // Terminology, before refusing (section 6.1). The corpus holds procedures,
    // not definitions, so "what does prakas mean" lands here rather than in
    // retrieval — and the off-domain copy below promises exactly that question
    // as something AskGov can answer. Placing the glossary here rather than at
    // Tier 1 means it can only ever convert a refusal into an answer, never
    // displace a retrieved one. See lib/engine/glossary.ts.
    const term = matchGlossary(question, lang);
    if (term) {
      return finish(
        {
          id,
          tier: 1,
          lang,
          answer: term.definition,
          // Nothing to cite: a definition of an instrument type asserts nothing
          // about any specific service. Attaching an instrument number and an
          // article to it would be inventing source metadata.
          citations: [],
          escalate: false,
        },
        baseDiagnostics({
          tier: 1,
          ...retrievalDiag,
          provider: "glossary",
          model: `${term.id} (${term.term})`,
          hosting: "In-process",
          residency: "Cambodia",
          confidence: "high",
        }),
      );
    }

    // Anything reaching here is in domain — the off-domain screen ran before
    // retrieval — so this is a coverage gap, and the officer is worth offering.
    const fallback = await tryGeneralFallback();
    if (fallback) return fallback;

    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: cannotAnswer(lang),
        citations: [],
        escalate: true,
        office: supportOffice(),
      },
      baseDiagnostics({
        tier: 3,
        ...retrievalDiag,
        // Not a policy refusal: AskGov is allowed to answer this, it simply has
        // no source that covers it. Usually a content coverage gap.
        refusalReason:
          candidates.length === 0
            ? "retrieval:no_candidates"
            : "retrieval:below_floor",
      }),
    );
  }

  // ── Aboutness gate (R-07) ────────────────────────────────────────────────
  // Retrieval scored these highly, but a high score means "similar", not
  // "answers this". A question naming a specific business shares its topic word
  // with the published rule and nothing else, which is how "Baby Outlet's
  // trademark" came back as the definition of a trademark, cited.
  const top = candidates[0].chunk;
  // Assessed against the RESOLVED query, not the bare follow-up. "where in
  // phnom penh?" has two content words, which is under the floor, so the gate
  // waved it through as trivially on-topic — the exact turn most in need of
  // checking. The resolved query carries the subject from earlier in the
  // conversation, which is what the source has to be about.
  const topical = assess(query.normalised, `${top.text}\n${top.textKm ?? ""}`);

  if (looksLikeEntityLookup(question)) {
    // Public registers exist for exactly this. Refusing without naming them is
    // the dead end that makes a correct refusal feel useless.
    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: entityLookup(lang),
        citations: [],
        escalate: true,
        office: supportOffice(),
      },
      baseDiagnostics({
        tier: 3,
        ...retrievalDiag,
        confidence: "low",
        refusalReason: "scope:entity_record_lookup",
      }),
    );
  }

  // ── Tier 2: generation over retrieved sources only (FR-14) ───────────────
  // Both variants, kept separate. FR-08: the answer must be in the citizen's
  // language, and a provider that quotes verbatim cannot honour that unless it
  // can tell the two apart.
  const sources = candidates.map((c) => ({
    id: c.chunk.id,
    header: `${c.chunk.ministry} — ${c.chunk.doc}, ${c.chunk.instrument}, ${c.chunk.article} (effective ${c.chunk.effective}, verified ${c.chunk.verified})`,
    text: c.chunk.text,
    textKm: c.chunk.textKm,
  }));

  // ── Rationale gate ───────────────────────────────────────────────────────
  //
  // The citizen asked WHY a rule exists, the retrieved sources are about the
  // right subject, and not one of them gives a reason. See the header of
  // lib/engine/rationale.ts for the answer this prevents — a tautology that the
  // verification gate passes because every clause of it is genuinely supported.
  //
  // Decided here rather than by the model, and that placement is the fix. Rule 2
  // of the grounding prompt already tells the model to escalate when the SOURCES
  // do not contain the answer, and the escalation branch below already handles
  // it correctly. Production showed the model simply does not agree that it is
  // in that situation: asked why the late penalty exists it read the penalty
  // provision as the answer, restated it, and appended "because the regulation
  // provides that a licence expired for more than 30 days is subject to a daily
  // penalty". Nothing downstream could catch that. The same argument the
  // off-domain screen makes above applies here — a rule that holds only when the
  // configured model family happens to comply is not a rule.
  //
  // Gated on topical.onTopic because the copy asserts that AskGov HAS a source
  // setting out the rule. When retrieval only found something adjacent, that
  // claim would be false, and the ordinary path below already downgrades and
  // captions an off-topic source honestly.
  //
  // Running before generation is deliberate: the answer does not depend on
  // anything the model would say, so the call is pure cost and pure risk.
  //
  // Tested against the TOP source alone, not the whole candidate set, and that
  // is load-bearing. "Why is there a late penalty" retrieves MPWT-DL-008 first
  // — which states the penalty and gives no reason — but also drags in
  // NBC-IR-001 at rank four, an interest-rate cap whose text happens to contain
  // "to protect consumers from excessive interest rates". Scanning every
  // candidate let that unrelated purpose clause report that the reason had been
  // found, and the gate never fired. A reason in a source that is not about the
  // question does not answer the question.
  //
  // The top source is also what `topical` above is assessed against, so the two
  // gates judge the same passage rather than quietly disagreeing about which
  // source the answer is really resting on. The cost is a rationale sitting in
  // the second candidate and not the first, which escalates a question the
  // corpus could have answered — the over-refusal direction §13 prefers, and
  // recoverable through the officer.
  if (topical.onTopic && rationaleGap(question, [top.text])) {
    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: reasonNotInSource(lang),
        // The rule is not what was asked for. Citing the provision here would
        // put the "what" back in front of a citizen who has already been told
        // it twice — which is the complaint this whole path exists to answer.
        citations: [],
        escalate: true,
        office: supportOffice(),
      },
      baseDiagnostics({
        tier: 3,
        ...retrievalDiag,
        confidence: "low",
        // Distinct from provider:escalated. The corpus covers this subject and
        // the engine, not the model, decided the question was unanswerable from
        // it — and the rate of these is a content signal worth measuring
        // separately: a "why" the corpus cannot answer is a gap in the
        // published source page, and the fix for it is content, not code.
        refusalReason: "rationale:not_in_source",
      }),
    );
  }

  const outcome = await generate({
    question: query.normalised,
    lang,
    sources,
    history,
  });

  const providerDiag = {
    provider: outcome.provider.id,
    model: outcome.provider.model,
    hosting: outcome.provider.hosting,
    residency: outcome.provider.residency,
    providerFallback: outcome.fallbackReason,
  };

  // The model claimed it cannot answer, or produced no citations.
  if (outcome.shouldEscalate || !outcome.answer) {
    /*
      Retrieval returned something the model would not answer from. That is a
      coverage gap ONLY when what it returned was not about the question.

      This used to hand every escalation to the unsourced fallback, on the
      reading that a model declining meant the corpus held nothing. It does not.
      "Why is there a late penalty" retrieves MPWT-DL-008 — which states the
      penalty, its rate, and when it starts — and the model escalates because the
      source gives the rule and not the REASON for it. The citizen was then told
      "AskGov has no approved government document covering this" and handed
      general-knowledge speculation ("it may encourage people to complete the
      procedure on time"). The notice was false: an approved source covers late
      penalties. Substituting invented rationale for a published rule is the
      §13 failure the fallback is supposed to be fenced away from.

      So the fallback is offered only when the top source is genuinely off the
      topic. When it is on topic, the honest ending is the escalation below: the
      corpus has something, this particular question is not answered by it, and
      an officer is the way to a real answer.
    */
    const fallback = topical.onTopic ? null : await tryGeneralFallback();
    if (fallback) return fallback;

    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: outcome.answer || cannotAnswer(lang),
        citations: [],
        escalate: true,
        office: supportOffice(),
      },
      baseDiagnostics({
        tier: 3,
        ...retrievalDiag,
        ...providerDiag,
        confidence: outcome.confidence,
        refusalReason: "provider:escalated",
      }),
    );
  }

  // ── Verification gate (FR-15) ────────────────────────────────────────────
  const citedChunks = candidates
    .filter((c) => outcome.citations.includes(c.chunk.id))
    .map((c) => c.chunk);

  const verification = verify(
    outcome.answer,
    outcome.citations,
    citedChunks.map((c) => ({
      id: c.id,
      // Verify against both language variants: the model may paraphrase a
      // Khmer figure from the English body or the reverse.
      text: `${c.text}\n${c.textKm ?? ""}`,
    })),
    candidates.map((c) => c.chunk.id),
  );

  const diagVerification = {
    passed: verification.passed,
    unsupported: [...verification.unsupported, ...verification.invalidCitations],
  };

  if (!verification.passed) {
    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: SUPPRESSED[lang],
        citations: [],
        escalate: true,
        office: supportOffice(),
      },
      baseDiagnostics({
        tier: 3,
        ...retrievalDiag,
        ...providerDiag,
        confidence: "low",
        verification: diagVerification,
        refusalReason: "verification:failed",
      }),
    );
  }

  // ── Output moderation (NFR-04) ───────────────────────────────────────────
  const moderation = moderateOutput(outcome.answer);
  if (moderation) {
    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: moderation.message[lang],
        citations: [],
        escalate: true,
        office: supportOffice(),
      },
      baseDiagnostics({
        tier: 3,
        ...retrievalDiag,
        ...providerDiag,
        confidence: "low",
        verification: diagVerification,
        refusalReason: `moderation:${moderation.kind}`,
      }),
    );
  }

  // ── Answer stands. Assemble citations (FR-20 → FR-26) ────────────────────
  const citations = citedChunks.map((c) => toCitation(c, lang));
  const anyStale = citations.some((c) => c.freshness === "stale");

  // Off-topic is a downgrade, not a suppression. The citizen gets the closest
  // approved source with its citation, told plainly that it may not address
  // what they asked — which beats both a confident wrong answer and a dead end.
  const caveat = topical.onTopic
    ? ""
    : (lang === "km"
        ? `\n\n⚠️ ចម្លើយនេះជាឯកសារជិតបំផុតដែល AskGov រកឃើញ ប៉ុន្តែវាប្រហែលជាមិនឆ្លើយសំណួររបស់អ្នកដោយផ្ទាល់ទេ។ ឯកសារនេះមិនបាននិយាយអំពី៖ ${topical.missing.slice(0, 6).join(" ")}`
        : `\n\n⚠️ This is the closest approved source AskGov found, but it may not answer what you asked. The source says nothing about: ${topical.missing.slice(0, 6).join(", ")}`);

  const answer =
    (anyStale ? `${outcome.answer}\n\n${STALE_NOTICE[lang]}` : outcome.answer) +
    caveat;

  for (const d of diagCandidates) {
    d.cited = outcome.citations.includes(d.id);
  }

  const tier: Tier = 2;
  const staleAdjusted: Confidence = anyStale
    ? outcome.confidence === "high"
      ? "medium"
      : outcome.confidence
    : outcome.confidence;
  // A source that does not mention most of what was asked cannot support a
  // high-confidence answer, whatever the retrieval score said.
  const confidence: Confidence = topical.onTopic ? staleAdjusted : "low";

  return finish(
    {
      id,
      tier,
      lang,
      answer,
      citations,
      escalate: false,
    },
    baseDiagnostics({
      tier,
      ...retrievalDiag,
      ...providerDiag,
      candidates: diagCandidates,
      confidence,
      verification: diagVerification,
    }),
  );
}
