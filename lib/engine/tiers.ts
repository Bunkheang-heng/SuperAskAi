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
import { retrieve } from "@/lib/retrieval";
import { getKb } from "@/lib/kb/loader";
import { generate, PROMPT_VERSION } from "@/lib/llm";
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

    // Off-domain and coverage gap both end in a refusal, but they are different
    // failures and deserve different words. Escalation is offered only for the
    // coverage gap: sending someone to a government officer because they asked
    // how to say hello wastes the officer's time and the citizen's.
    const offDomain = isOffDomain(question);

    return finish(
      {
        id,
        tier: 3,
        lang,
        answer: offDomain ? notAServiceQuestion(lang) : cannotAnswer(lang),
        citations: [],
        escalate: !offDomain,
        office: offDomain ? undefined : supportOffice(),
      },
      baseDiagnostics({
        tier: 3,
        ...retrievalDiag,
        // Not a policy refusal: AskGov is allowed to answer this, it simply has
        // no source that covers it. Usually a content coverage gap.
        refusalReason: offDomain
          ? "scope:not_a_service_question"
          : candidates.length === 0
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
  const topical = assess(question, `${top.text}\n${top.textKm ?? ""}`);

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
