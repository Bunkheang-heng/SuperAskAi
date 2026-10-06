/**
 * Shared contracts between the retrieval/generation server and the citizen
 * interface. Every field the interface renders is defined here so that
 * FR-63 (full source attribution) cannot silently lose a field.
 */

export type Lang = "km" | "en";

export type Freshness = "fresh" | "due" | "stale";

/** Answer tier per PRD section 10.2. */
export type Tier = 1 | 2 | 3;

export type Confidence = "high" | "medium" | "low";

/**
 * A unit of source content indexed for retrieval — one article or provision
 * (glossary: "Chunk"). Metadata fields are mandated by FR-45.
 */
export interface Chunk {
  id: string;
  ministry: string;
  ministryKm: string;
  /** Source document title (FR-20). */
  doc: string;
  /** Legal instrument number (FR-21). */
  instrument: string;
  /** Article or annex reference (FR-21). */
  article: string;
  /** Link to the original source document (FR-23). */
  url?: string;
  /** Date the content took effect. */
  effective: string;
  /** Date the content was last verified (FR-22). */
  verified: string;
  /** Date after which the content is flagged for review (FR-52). */
  reviewDue: string;
  /** ISO 3166-2 subdivision or "KH" for nationwide. */
  geoScope: string;
  sensitivity: "public" | "internal" | "restricted";
  /** Superseded versions are excluded from retrieval (FR-18, FR-58). */
  superseded?: boolean;
  /**
   * Has a ministry content steward approved this chunk for citizens?
   *
   * Absent on the hand-written sample corpus. Explicitly `false` on anything
   * §8.6 ingestion produced, because a crawler fetching a page is not a human
   * approving it (§10.5, FR-49). The citation surfaces the difference so a
   * citizen is never shown machine-ingested text as though a steward had
   * signed it off.
   */
  stewardApproved?: boolean;
  /** When ingestion fetched this, and from where (FR-54 provenance). */
  ingestedAt?: string;
  ingestedFrom?: string;
  text: string;
  textKm?: string;
  /** Maintained alias set for colloquial → official terminology (FR-06). */
  keywords: string[];
  /**
   * Candidate citizen questions generated per chunk and indexed alongside it
   * (FR-44). This is the single largest lever on Khmer retrieval recall (R-07).
   */
  questions: string[];
}

/** A retrieval candidate with its component and fused scores (FR-72). */
export interface Candidate {
  chunk: Chunk;
  /** Keyword / BM25 component. */
  lexical: number;
  /** Dense vector component. */
  dense: number;
  /** Reciprocal rank fusion score. */
  fused: number;
  /** Cross-encoder rerank score (FR-13). */
  rerank: number;
  cited: boolean;
}

/** Source attribution rendered beneath every answer (FR-62, FR-63, FR-64). */
export interface Citation {
  id: string;
  ministry: string;
  ministryKm: string;
  doc: string;
  instrument: string;
  article: string;
  url?: string;
  effective: string;
  verified: string;
  reviewDue: string;
  freshness: Freshness;
  quote: string;
}

/** Internal diagnostic payload. DGC and ministry users only (FR-72, FR-73). */
export interface Diagnostics {
  tier: Tier;
  provider: string;
  model: string;
  hosting: string;
  residency: string;
  promptVersion: string;
  detectedLang: Lang;
  normalisedQuery: string;
  segments: string[];
  expandedTerms: string[];
  rewrittenQuery?: string;
  candidates: Array<{
    id: string;
    lexical: number;
    dense: number;
    fused: number;
    rerank: number;
    cited: boolean;
  }>;
  confidence: Confidence;
  verification: {
    passed: boolean;
    /** Claims present in the answer but absent from cited sources. */
    unsupported: string[];
  };
  /**
   * Why the answer was withheld, when it was. Two different mechanisms land
   * here and conflating them makes triage misleading, so the value is prefixed:
   *
   *   policy:<kind>       §12 refusal policy fired before retrieval
   *                       (emergency, legal_advice, political, …)
   *   scope:not_a_service_question  not a government-service question at all —
   *                       translation, general knowledge, chit-chat
   *   retrieval:below_floor  no source scored above RETRIEVAL_MIN_SCORE (FR-16)
   *   retrieval:no_candidates  nothing retrieved at all
   *   verification:failed  FR-15 gate suppressed a written answer
   *   moderation:<kind>    NFR-04 output moderation caught the answer
   *   provider:escalated   the model itself declined to answer
   *   rationale:not_in_source  the citizen asked WHY a rule exists and the
   *                       sources state the rule without giving a reason. The
   *                       ENGINE decided this, not the model — see
   *                       lib/engine/rationale.ts. Kept separate from
   *                       provider:escalated because the corpus does cover the
   *                       subject: the rate of these measures a gap in the
   *                       published source pages, and the fix is content.
   *   fallback:general_knowledge  NOT a refusal — no source covered the
   *                       question and GENERAL_FALLBACK_ENABLED served an
   *                       unverified model answer instead. Recorded here so the
   *                       audit log can separate unsourced answers from sourced
   *                       ones without parsing the answer text.
   *
   * "policy:" means SuperAsk is not allowed to answer, "scope:" means there was
   * nothing of its kind to answer. Everything else means it could not — usually
   * a content coverage gap, not a policy decision.
   *
   * Absent on a Tier 1 glossary answer: that path is not a refusal. It is
   * reached from the same branch, but it ends in an answer.
   */
  refusalReason?: string;
  latencyMs: number;
  /** Set when the configured provider failed and a fallback served (NFR-09). */
  providerFallback?: string;
}

export interface AskResponse {
  /** Server-assigned id, used to correlate feedback and audit records. */
  id: string;
  tier: Tier;
  lang: Lang;
  answer: string;
  citations: Citation[];
  escalate: boolean;
  /** Responsible office details, supplied when handover is unavailable (FR-29). */
  office?: {
    name: string;
    address: string;
    hours: string;
    phone: string;
  };
  /**
   * The answer came from the model's general knowledge, not from an approved
   * source, because no source in the corpus covered the question and the
   * GENERAL_FALLBACK_ENABLED operator switch is on.
   *
   * `citations` is always empty when this is set, and the interface must render
   * an unverified marker. Absent or false means every claim in the answer is
   * backed by a cited approved source — the default contract.
   */
  unverified?: boolean;
  /** Emergency path: FR guardrail 6. Terminates the interaction. */
  terminal?: boolean;
  diagnostics?: Diagnostics;
}

export interface AskRequest {
  question: string;
  /** Prior turns, for session context resolution (FR-07). */
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  sessionId?: string;
}
