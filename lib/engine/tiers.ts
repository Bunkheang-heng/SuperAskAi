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
  Confidence,
  Diagnostics,
  Tier,
} from "@/lib/types";
import { detectLang } from "@/lib/lang/detect";
import { retrieve } from "@/lib/retrieval";
import { generate, PROMPT_VERSION } from "@/lib/llm";
import { createTrace, runWithTrace, trace, flushTrace } from "@/lib/log/trace";
import { matchCurated } from "./curated";
import { matchGlossary } from "./glossary";
import { assess, looksLikeEntityLookup } from "./topicality";
import {
  screen,
  moderateOutput,
  isOffDomain,
  inScopeHistory,
  type GuardrailHit,
} from "./guardrails";
import { verify } from "./verify";
import { STALE_NOTICE } from "./freshness";
import { rationaleGap } from "./rationale";
import {
  notAServiceQuestion,
  cannotAnswer,
  reasonNotInSource,
  entityLookup,
  SUPPRESSED,
} from "./copy";
import { toCitation, supportOffice } from "./citations";
import { tryGeneralFallback } from "./fallback";

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

export async function ask(req: AskRequest): Promise<AskResponse> {
  const id = randomUUID();
  return runWithTrace(createTrace(id), () => executeAsk(req, id));
}

async function executeAsk(req: AskRequest, id: string): Promise<AskResponse> {
  const started = performance.now();
  const history = inScopeHistory(req.history ?? []);
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

  const finish = (res: AskResponse, diag: Diagnostics): AskResponse => {
    const out: AskResponse = {
      ...res,
      diagnostics: diagnosticsEnabled
        ? { ...diag, latencyMs: Math.round(performance.now() - started) }
        : undefined,
    };
    trace("done", {
      tier: out.tier,
      lang: out.lang,
      escalate: out.escalate,
      unverified: out.unverified === true,
      terminal: out.terminal === true,
      refusalReason: diag.refusalReason,
      provider: diag.provider,
      model: diag.model,
      answer: out.answer,
      citations: out.citations.map((c) => c.id),
      latencyMs: Math.round(performance.now() - started),
    });
    void flushTrace();
    return out;
  };

  trace("received", {
    question,
    historyTurns: history.length,
    history: history.map((t) => ({ role: t.role, text: t.text })),
  });
  trace("lang", { lang });

  // ── Guardrails, before any retrieval or model call (section 12) ───────────
  const hit: GuardrailHit | null = screen(question);
  if (hit) {
    trace("guardrail", { hit: hit.kind, terminal: hit.terminal });
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
  trace("guardrail", { hit: null });

  // ── Tier 1: curated answer, no generation (FR-10, FR-11) ─────────────────
  const curated = matchCurated(question, lang, CURATED_THRESHOLD);
  if (curated) {
    trace("curated", { id: curated.id, score: Number(curated.score.toFixed(3)) });
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
  trace("curated", { hit: false });

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
    trace("scope", { reason: "not_a_service_question" });
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

  trace("retrieval", {
    normalised: query.normalised,
    rewritten: query.rewritten,
    topScore: Number(topScore.toFixed(3)),
    floor: RETRIEVAL_MIN_SCORE,
    candidates: diagCandidates.map((c) => ({
      id: c.id,
      fused: c.fused,
      rerank: c.rerank,
    })),
  });

  const generalFallback = () =>
    tryGeneralFallback({
      question,
      history,
      lang,
      normalisedQuery: query.normalised,
      id,
      retrievalDiag,
      finish,
      baseDiagnostics,
    });

  // ── Confidence gate: escalate rather than generate over weak sources ─────
  // FR-16. This runs before generation on purpose (section 13).
  if (candidates.length === 0 || topScore < RETRIEVAL_MIN_SCORE) {
    trace("confidence_gate", {
      passed: false,
      topScore: Number(topScore.toFixed(3)),
      floor: RETRIEVAL_MIN_SCORE,
    });
    // Terminology, before refusing (section 6.1). The corpus holds procedures,
    // not definitions, so "what does prakas mean" lands here rather than in
    // retrieval — and the off-domain copy below promises exactly that question
    // as something SuperAsk can answer. Placing the glossary here rather than at
    // Tier 1 means it can only ever convert a refusal into an answer, never
    // displace a retrieved one. See lib/engine/glossary.ts.
    const term = matchGlossary(question, lang);
    if (term) {
      trace("glossary", { id: term.id, term: term.term });
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
    const fallback = await generalFallback();
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
        // Not a policy refusal: SuperAsk is allowed to answer this, it simply has
        // no source that covers it. Usually a content coverage gap.
        refusalReason:
          candidates.length === 0
            ? "retrieval:no_candidates"
            : "retrieval:below_floor",
      }),
    );
  }
  trace("confidence_gate", {
    passed: true,
    topScore: Number(topScore.toFixed(3)),
    floor: RETRIEVAL_MIN_SCORE,
  });

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
  trace("topicality", {
    onTopic: topical.onTopic,
    missing: topical.missing.slice(0, 8),
  });

  if (looksLikeEntityLookup(question)) {
    trace("scope", { reason: "entity_record_lookup" });
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
  // Gated on topical.onTopic because the copy asserts that SuperAsk HAS a source
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
    trace("rationale", { gap: true });
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
    question,
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
      "SuperAsk has no approved government document covering this" and handed
      general-knowledge speculation ("it may encourage people to complete the
      procedure on time"). The notice was false: an approved source covers late
      penalties. Substituting invented rationale for a published rule is the
      §13 failure the fallback is supposed to be fenced away from.

      So the fallback is offered only when the top source is genuinely off the
      topic. When it is on topic, the honest ending is the escalation below: the
      corpus has something, this particular question is not answered by it, and
      an officer is the way to a real answer.
    */
    const fallback = topical.onTopic ? null : await generalFallback();
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

  trace("verify", {
    passed: verification.passed,
    unsupported: [...verification.unsupported, ...verification.invalidCitations],
  });

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
    trace("moderation", { hit: moderation.kind });
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
        ? `\n\n⚠️ ចម្លើយនេះជាឯកសារជិតបំផុតដែល SuperAsk រកឃើញ ប៉ុន្តែវាប្រហែលជាមិនឆ្លើយសំណួររបស់អ្នកដោយផ្ទាល់ទេ។ ឯកសារនេះមិនបាននិយាយអំពី៖ ${topical.missing.slice(0, 6).join(" ")}`
        : `\n\n⚠️ This is the closest approved source SuperAsk found, but it may not answer what you asked. The source says nothing about: ${topical.missing.slice(0, 6).join(", ")}`);

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
