/**
 * Content monitoring contracts (FR-47 → FR-54, section 10.4).
 *
 * The single invariant this whole subsystem is built around: a crawl produces
 * a CHANGE SIGNAL and nothing else. Nothing fetched here reaches a citizen, or
 * the retrieval corpus, without a steward approving it (FR-49). There is
 * deliberately no code path from the crawler to data/kb/.
 */

export type Adapter = "web" | "facebook" | "telegram" | "video" | "document";

export type SourceCategory =
  | "government"
  | "portal"
  | "ministry"
  | "institution"
  | "agency";

/**
 * How the registry came to believe this domain exists.
 *
 * `unconfirmed` is the one that matters operationally: those domains were
 * DERIVED from a documented naming convention rather than observed, so they are
 * leads. Probing one is how it gets confirmed; nothing from an unconfirmed
 * source may be ingested until its homepage returns 2xx and confirms ownership.
 */
export type Provenance = "directory" | "wikipedia" | "search" | "unconfirmed";

/** One monitored source. Organisation identity is metadata (section 10.4). */
export interface Source {
  id: string;
  /** Row id in data/registry/, so a record here maps back to the registry. */
  registryId: number;
  org: string;
  orgKm?: string;
  abbr?: string;
  category: string;
  parentMinistry?: string;
  url: string;
  host: string;
  adapter: Adapter;
  /** 1 = citizen-facing answers, crawl deepest. 3 = peripheral. */
  priority: number;
  verified: Provenance;
  renderMode: "static" | "headless";
  /** Link-following depth from the seed URL. 0 = seed only. */
  depth: number;
  maxPages: number;
  /** Per-registry politeness floor; robots.txt Crawl-delay can raise it. */
  politenessDelayMs: number;
  enabled: boolean;
  disabledReason?: string;
  /**
   * A known access obstacle that does not stop this source being monitored.
   *
   * Deliberately not a reason to disable. A host behind a WAF is still a
   * source AskGov wants; the crawler now recognises the refusal (soft-block.ts)
   * instead of recording it, so monitoring costs one request and reports the
   * true state — and starts working by itself the day access is granted.
   */
  accessNote?: string;
  /** Ministry name in data/kb/, when this source feeds onboarded content. */
  kbMinistry?: string;
  notes?: string;
}

/**
 * Result of a seed-only probe — the enrichment pass build_dataset.py leaves
 * empty and delegates to `enrich_crawler.py`.
 *
 * Cheap by design: one request per host plus robots.txt, no link following. It
 * answers the questions that gate everything else — is this domain real, does
 * it redirect somewhere canonical, does robots.txt let us in — before any
 * decision to spend a deep crawl on it.
 */
export interface VerificationResult {
  sourceId: string;
  registryId: number;
  org: string;
  host: string;
  url: string;
  priority: number;
  /** Registry belief before this probe. */
  claimed: Provenance;
  httpStatus: number;
  /** Where we ended up after redirects — the canonical-resolution answer. */
  finalUrl: string;
  redirected: boolean;
  /** finalUrl left the registry host entirely: likely an alias or a parking page. */
  offHost: boolean;
  https: boolean;
  homepageTitle: string;
  textLength: number;
  robotsExists: boolean;
  robotsAllowsUs: boolean;
  crawlDelayMs: number | null;
  sitemapUrls: string[];
  /**
   * live      — 2xx with real content
   * empty     — 2xx but almost no text, likely an SPA shell or a parking page
   * redirect  — resolved to a different host
   * dead      — 4xx/5xx or no response
   * blocked   — robots.txt forbids us
   * rejected  — 2xx whose body is a refusal: a WAF interstitial or an API
   *             failure envelope. Distinct from `blocked`, which is a rule the
   *             operator wrote and we are honouring, and from `dead`, which is
   *             the site being broken. `rejected` means the site works, is
   *             refusing us specifically, and did not use a status code to say
   *             so — the one case a status-code-trusting crawler records as
   *             content (lib/crawl/soft-block.ts).
   */
  outcome: "live" | "empty" | "redirect" | "dead" | "blocked" | "rejected";
  /** Which detector fired, when the outcome is `rejected` or `blocked`. */
  softBlock?: string;
  error?: string;
  checkedAt: string;
}

/**
 * What one page looked like at one moment (FR-54).
 *
 * Two hashes, because they answer different questions. `rawHash` is provenance
 * — the exact bytes served. `textHash` is the change signal: government sites
 * embed CSRF nonces, session ids, view counters and "generated at" timestamps
 * that change the raw bytes on every single fetch, so a raw-hash comparison
 * would report all 43 sources as changed every week and the review queue would
 * be noise within a fortnight.
 */
export interface PageSnapshot {
  url: string;
  /** HTTP status of the fetch that produced this snapshot. */
  status: number;
  title: string;
  rawHash: string;
  textHash: string;
  /** Extracted text length, a cheap signal for "page went blank". */
  textLength: number;
  fetchedAt: string;
  /** Path under var/monitor/raw/ holding the retained copy (FR-54). */
  rawPath: string;
}

export interface SourceSnapshot {
  sourceId: string;
  crawledAt: string;
  pages: Record<string, PageSnapshot>;
  /** Sources that could not be reached at all, with the reason. */
  error?: string;
}

/**
 * Risk class of a detected change, per the section 10.5 gating table.
 *
 * `factual` covers fees, deadlines, required documents, eligibility and
 * procedure steps — steward approval required, always.
 *
 * `presentation` covers everything else. Section 10.5 permits automating those,
 * but this build does not: see ChangeSignal.autoPublishable.
 */
export type ChangeRisk = "factual" | "presentation";

export type ChangeKind = "new" | "modified" | "removed" | "unreachable";

/** One detected change, raised to the responsible steward's queue (FR-49). */
export interface ChangeSignal {
  id: string;
  sourceId: string;
  org: string;
  kbMinistry?: string;
  url: string;
  kind: ChangeKind;
  risk: ChangeRisk;
  /** Which section 10.5 terms were seen in the changed text. */
  riskTerms: string[];
  detectedAt: string;
  previousFetchedAt?: string;
  title: string;
  /** Retained copies either side of the change, for the diff view (FR-33). */
  previousRawPath?: string;
  currentRawPath?: string;
  /**
   * Always false in this build, for every risk class.
   *
   * Section 10.5 permits auto-publishing presentation-only changes, but that
   * permission assumes a classifier trustworthy enough to decide what is
   * presentation-only. This one is a keyword scan; a fee moved into an image,
   * or a deadline reworded without digits, reads as presentation to it. Until
   * FR-31's portal and FR-59's RBAC exist there is also no steward to answer
   * to, so the safe default is the one that cannot publish anything.
   */
  autoPublishable: false;
  status: "pending";
}

export interface CrawlReport {
  startedAt: string;
  finishedAt: string;
  sourcesAttempted: number;
  sourcesReachable: number;
  pagesFetched: number;
  pagesBlockedByRobots: number;
  /**
   * 200s discarded because the body was a refusal rather than a page.
   *
   * Reported separately from `pagesFetched` because the two answer different
   * questions: how much did we ask for, and how much did we actually get. A
   * run where those diverge is a run whose sources need a conversation, not a
   * retry.
   */
  pagesRejected: number;
  changes: {
    total: number;
    factual: number;
    presentation: number;
    byKind: Record<ChangeKind, number>;
  };
  errors: Array<{ sourceId: string; error: string }>;
}
