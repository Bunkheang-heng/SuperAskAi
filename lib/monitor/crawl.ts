/**
 * The monitoring orchestrator (FR-47, FR-49, FR-54, section 10.4).
 *
 * One scheduler across platform-specific adapters. Only the `web` adapter is
 * implemented; Facebook, Telegram, video and document adapters (FR-48, FR-46)
 * plug in against this same registry and this same change-signal output.
 *
 * ── THE INVARIANT ──────────────────────────────────────────────────────────
 * This module writes to var/. It does not write to data/kb/, and there is no
 * function here that could. A crawl raises change signals to the steward review
 * queue; a steward publishes. That separation is FR-49 and section 10.4's
 * closing line, and it is the reason this crawler can be pointed at forty-three
 * live government sites without any risk of unreviewed content reaching a
 * citizen.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ChangeSignal,
  CrawlReport,
  PageSnapshot,
  Source,
  SourceSnapshot,
} from "./types";
import { politeFetch, USER_AGENT } from "./fetch";
import { getRobots } from "./robots";
import { extract } from "./extract";
import { classify, changedLines } from "./classify";
import {
  loadSnapshots,
  saveSnapshots,
  raiseToQueue,
  retainRaw,
  readRaw,
  saveReport,
  sha256,
} from "./store";

/** data/sources.json is generated — see scripts/build-sources.ts. */
export function loadSources(): Source[] {
  const file = JSON.parse(
    readFileSync(join(process.cwd(), "data", "sources.json"), "utf8"),
  ) as { sources: Source[] };

  return file.sources;
}

/**
 * Text hash is the change signal, raw hash is provenance.
 *
 * Government CMSs embed CSRF tokens, view counters and render timestamps that
 * change the bytes on every fetch. Hashing raw HTML would report all 43 sources
 * as changed every week, and a review queue that cries wolf weekly is a review
 * queue nobody opens.
 */
function snapshotPage(
  sourceId: string,
  url: string,
  status: number,
  body: string,
  title: string,
  text: string,
  fetchedAt: string,
): PageSnapshot {
  const rawHash = sha256(body);
  return {
    url,
    status,
    title,
    rawHash,
    textHash: sha256(text),
    textLength: text.length,
    fetchedAt,
    rawPath: retainRaw(sourceId, url, body, rawHash),
  };
}

interface CrawlOptions {
  /** Restrict the run to these source ids. */
  only?: string[];
  /** Restrict to these crawl priorities. 1 = citizen-facing answers. */
  priority?: number[];
  /**
   * Crawl sources whose domain is an unproven lead.
   *
   * Off by default. 51 of the 130 registry entries are `verified=unconfirmed` —
   * derived from a naming convention, never observed — and the registry is
   * explicit that they must not be ingested before a probe confirms them. Run
   * `--mode=verify` first; it rewrites nothing but tells you which leads are
   * real.
   */
  includeUnconfirmed?: boolean;
  /** Fetch and compare, but write nothing. */
  dryRun?: boolean;
  onProgress?: (line: string) => void;
}

async function crawlSource(
  source: Source,
  previous: SourceSnapshot | undefined,
  log: (line: string) => void,
): Promise<{
  snapshot: SourceSnapshot;
  changes: ChangeSignal[];
  fetched: number;
  blocked: number;
}> {
  const changes: ChangeSignal[] = [];
  const pages: Record<string, PageSnapshot> = {};
  const crawledAt = new Date().toISOString();

  let fetched = 0;
  let blocked = 0;

  const robots = await getRobots(source.url, USER_AGENT);
  if (robots.blocked) {
    log(`  robots.txt refused (401/403) — skipping entire source`);
    return {
      snapshot: { sourceId: source.id, crawledAt, pages: {}, error: "robots-refused" },
      changes: [],
      fetched: 0,
      blocked: 1,
    };
  }

  // Breadth-first from the seed, same host only, bounded by depth and maxPages.
  const queue: Array<{ url: string; depth: number }> = [
    { url: source.url, depth: 0 },
  ];
  const seen = new Set<string>([source.url]);

  while (queue.length > 0 && fetched < source.maxPages) {
    const { url, depth } = queue.shift()!;

    if (!robots.isAllowed(url)) {
      blocked += 1;
      continue;
    }

    const res = await politeFetch(
      url,
      Math.max(robots.crawlDelayMs, source.politenessDelayMs),
    );
    fetched += 1;

    if (res.status !== 200) {
      // A seed that will not load is a source-level failure worth reporting;
      // a sub-page 404 is ordinary site churn and only matters if we had it
      // before, which the removal pass below handles.
      if (depth === 0) {
        log(`  seed unreachable — HTTP ${res.status || "no response"}`);
        return {
          snapshot: {
            sourceId: source.id,
            crawledAt,
            pages: {},
            error: res.status ? `HTTP ${res.status}` : res.body || "unreachable",
          },
          changes: [],
          fetched,
          blocked,
        };
      }
      continue;
    }

    const { title, text, links } = extract(res.body, res.url);
    const snap = snapshotPage(
      source.id,
      url,
      res.status,
      res.body,
      title,
      text,
      res.fetchedAt,
    );
    pages[url] = snap;

    const before = previous?.pages[url];
    if (!before) {
      // Only report new pages once we have a baseline. On the very first run
      // every page is "new", which is not a change signal, it is an inventory.
      if (previous) {
        const { risk, terms } = classify(text);
        changes.push(
          signal(source, url, "new", risk, terms, title, undefined, snap),
        );
      }
    } else if (before.textHash !== snap.textHash) {
      // Recover the previous text from the retained copy so the classifier sees
      // the difference, not the whole page. If the copy is gone, classify the
      // full text — that over-reports as factual, which is the safe direction.
      const previousRaw = readRaw(before.rawPath);
      const previousText = previousRaw
        ? extract(previousRaw, before.url).text
        : null;
      const diff = previousText ? changedLines(previousText, text) : "";

      const { risk, terms } = classify(diff || text);
      changes.push(
        signal(source, url, "modified", risk, terms, title, before, snap),
      );
    }

    if (depth < source.depth) {
      for (const link of links) {
        if (seen.has(link)) continue;
        if (seen.size >= source.maxPages * 3) break;
        seen.add(link);
        queue.push({ url: link, depth: depth + 1 });
      }
    }
  }

  // Pages we held last time and did not see now. A removed page that carried a
  // fee or a procedure is exactly the change a steward needs to know about.
  if (previous) {
    for (const [url, before] of Object.entries(previous.pages)) {
      if (pages[url]) continue;
      changes.push(
        signal(source, url, "removed", "factual", ["page-removed"], before.title, before, undefined),
      );
    }
  }

  return {
    snapshot: { sourceId: source.id, crawledAt, pages },
    changes,
    fetched,
    blocked,
  };
}

function signal(
  source: Source,
  url: string,
  kind: ChangeSignal["kind"],
  risk: ChangeSignal["risk"],
  riskTerms: string[],
  title: string,
  before: PageSnapshot | undefined,
  after: PageSnapshot | undefined,
): ChangeSignal {
  return {
    id: randomUUID(),
    sourceId: source.id,
    org: source.org,
    kbMinistry: source.kbMinistry,
    url,
    kind,
    risk,
    riskTerms,
    detectedAt: new Date().toISOString(),
    previousFetchedAt: before?.fetchedAt,
    title,
    previousRawPath: before?.rawPath,
    currentRawPath: after?.rawPath,
    autoPublishable: false,
    status: "pending",
  };
}

export async function crawl(options: CrawlOptions = {}): Promise<CrawlReport> {
  const log = options.onProgress ?? (() => {});
  const startedAt = new Date().toISOString();

  const all = loadSources();
  const sources = all.filter(
    (s) =>
      s.enabled &&
      (!options.only || options.only.includes(s.id)) &&
      (!options.priority || options.priority.includes(s.priority)) &&
      (options.includeUnconfirmed || s.verified !== "unconfirmed"),
  );

  const state = loadSnapshots();
  const allChanges: ChangeSignal[] = [];
  const errors: Array<{ sourceId: string; error: string }> = [];

  let pagesFetched = 0;
  let pagesBlockedByRobots = 0;
  let reachable = 0;

  for (const [i, source] of sources.entries()) {
    log(`[${i + 1}/${sources.length}] ${source.abbr} — ${source.url}`);

    try {
      const result = await crawlSource(source, state[source.id], log);
      pagesFetched += result.fetched;
      pagesBlockedByRobots += result.blocked;

      if (result.snapshot.error) {
        errors.push({ sourceId: source.id, error: result.snapshot.error });
      } else {
        reachable += 1;
        // Only overwrite a good baseline with another good one. Letting a
        // transient outage clear the snapshot would make next week's run
        // report the entire site as new.
        state[source.id] = result.snapshot;
      }

      allChanges.push(...result.changes);

      const factual = result.changes.filter((c) => c.risk === "factual").length;
      log(
        `  ${result.fetched} pages · ${result.changes.length} changes` +
          (factual ? ` (${factual} factual)` : "") +
          (result.blocked ? ` · ${result.blocked} blocked by robots` : ""),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ sourceId: source.id, error: message });
      log(`  failed — ${message}`);
    }
  }

  const byKind = { new: 0, modified: 0, removed: 0, unreachable: 0 };
  for (const c of allChanges) byKind[c.kind] += 1;

  const report: CrawlReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    sourcesAttempted: sources.length,
    sourcesReachable: reachable,
    pagesFetched,
    pagesBlockedByRobots,
    changes: {
      total: allChanges.length,
      factual: allChanges.filter((c) => c.risk === "factual").length,
      presentation: allChanges.filter((c) => c.risk === "presentation").length,
      byKind,
    },
    errors,
  };

  if (!options.dryRun) {
    saveSnapshots(state);
    raiseToQueue(allChanges);
    saveReport(report);
  }

  return report;
}
