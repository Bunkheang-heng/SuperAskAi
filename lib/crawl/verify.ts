/**
 * Seed verification — one probe per host, no link following.
 *
 * This is the pass `build_dataset.py` leaves for `enrich_crawler.py`: 26 of the
 * 54 registry columns cannot be filled without touching the live site, and were
 * deliberately left NULL rather than guessed. This fills the ones that gate
 * every later decision.
 *
 * ── WHY THIS RUNS BEFORE ANY DEEP CRAWL ────────────────────────────────────
 * 51 of the 130 registry entries are `verified = unconfirmed` — domains derived
 * from the documented <province>.gov.kh style convention rather than observed
 * anywhere. The registry is explicit that they are leads, not facts. Spending a
 * 60-page crawl on a domain that does not resolve is waste; worse, recording a
 * parking page or a registrar holding page as though it were ministry content
 * is how a lead quietly becomes a "source".
 *
 * One request per host answers it. 130 probes at the registry's 2s politeness
 * floor is a few minutes, against roughly 4,200 pages for the full crawl.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * It also resolves the eight canonical ambiguities the registry lists — maff vs
 * web.maff, nbc.gov.kh vs nbc.org.kh, mod vs mond, cdc vs SNEC — because a
 * redirect chain is exactly what distinguishes an alias from a separate
 * organisation, and `finalUrl` records where each one actually lands.
 */

import type { Source, VerificationResult } from "./types";
import { politeFetch, USER_AGENT } from "./fetch";
import { getRobots } from "./robots";
import { extract } from "./extract";
import { detectSoftBlock, looksLikeRobotsTxt, isThin } from "./soft-block";

/** Sitemap directives are host-level; robots.txt is where they are declared. */
function sitemapsFrom(robotsBody: string): string[] {
  return [...robotsBody.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
}

export async function verifySource(
  source: Source,
): Promise<VerificationResult> {
  const checkedAt = new Date().toISOString();

  const base: VerificationResult = {
    sourceId: source.id,
    registryId: source.registryId,
    org: source.org,
    host: source.host,
    url: source.url,
    priority: source.priority,
    claimed: source.verified,
    httpStatus: 0,
    finalUrl: "",
    redirected: false,
    offHost: false,
    https: source.url.startsWith("https://"),
    homepageTitle: "",
    textLength: 0,
    robotsExists: false,
    robotsAllowsUs: true,
    crawlDelayMs: null,
    sitemapUrls: [],
    outcome: "dead",
    checkedAt,
  };

  // robots.txt first, always — including for the probe itself.
  let robotsBody = "";
  try {
    const robotsRes = await politeFetch(
      `${new URL(source.url).origin}/robots.txt`,
      source.politenessDelayMs,
    );
    // "Exists" has to mean a readable robots.txt, not merely a 200. Hosts that
    // route every path to an app shell — or to a WAF page — answer /robots.txt
    // with 200 and a document containing no directives, and recording that as
    // `robots_txt: true` in the registry is a fact the registry does not have.
    if (robotsRes.status === 200 && looksLikeRobotsTxt(robotsRes.body)) {
      base.robotsExists = true;
      robotsBody = robotsRes.body;
      base.sitemapUrls = sitemapsFrom(robotsBody);
    }
  } catch {
    // A host with no reachable robots.txt is not an error; absence means no
    // restriction was stated. The seed probe below is the real test.
  }

  const robots = await getRobots(source.url, USER_AGENT);
  base.robotsAllowsUs = !robots.blocked && robots.isAllowed(source.url);
  base.crawlDelayMs = robots.crawlDelayMs;
  if (robots.note) base.softBlock = robots.note;

  if (!base.robotsAllowsUs) {
    return { ...base, outcome: "blocked" };
  }

  const res = await politeFetch(
    source.url,
    Math.max(robots.crawlDelayMs, source.politenessDelayMs),
  );

  base.httpStatus = res.status;
  base.finalUrl = res.url;

  if (res.status === 0) {
    return { ...base, outcome: "dead", error: res.body || "no response" };
  }

  try {
    const from = new URL(source.url);
    const to = new URL(res.url);
    base.https = to.protocol === "https:";
    base.redirected = from.href.replace(/\/$/, "") !== to.href.replace(/\/$/, "");
    // Treat www. and the apex as the same host — a www redirect is not an alias.
    base.offHost = from.host.replace(/^www\./, "") !== to.host.replace(/^www\./, "");
  } catch {
    // Malformed final URL; leave the defaults.
  }

  if (res.status < 200 || res.status >= 300) {
    return { ...base, outcome: "dead" };
  }

  // A 200 whose body is a refusal. Checked before `empty` and before
  // `redirect`, because "the host answered, with a rejection" is a more
  // specific and more actionable finding than either — and because a rejection
  // page is short enough that `empty` would otherwise swallow it and hide the
  // reason (lib/crawl/soft-block.ts).
  const softBlock = detectSoftBlock(res.body, res.contentType);
  if (softBlock) {
    const { title } = extract(res.body, res.url);
    return {
      ...base,
      homepageTitle: title,
      outcome: "rejected",
      softBlock: softBlock.detail,
    };
  }

  const { title, text } = extract(res.body, res.url);
  base.homepageTitle = title;
  base.textLength = text.length;

  if (base.offHost) return { ...base, outcome: "redirect" };
  if (isThin(text)) return { ...base, outcome: "empty" };

  return { ...base, outcome: "live" };
}

/**
 * Probe every source, hosts in parallel but each host serially.
 *
 * Concurrency is across DIFFERENT hosts only — politeFetch enforces the
 * per-host delay independently, so parallelism here never means two concurrent
 * requests to one ministry. Capped low because a burst of 130 simultaneous
 * connections from one address looks like a scan regardless of how polite each
 * individual request is.
 */
export async function verifyAll(
  sources: Source[],
  concurrency = Number(process.env.MONITOR_CONCURRENCY ?? "6"),
  onResult?: (r: VerificationResult, done: number, total: number) => void,
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  const queue = [...sources];
  let done = 0;

  async function worker() {
    for (;;) {
      const source = queue.shift();
      if (!source) return;

      let result: VerificationResult;
      try {
        result = await verifySource(source);
      } catch (err) {
        result = {
          sourceId: source.id,
          registryId: source.registryId,
          org: source.org,
          host: source.host,
          url: source.url,
          priority: source.priority,
          claimed: source.verified,
          httpStatus: 0,
          finalUrl: "",
          redirected: false,
          offHost: false,
          https: false,
          homepageTitle: "",
          textLength: 0,
          robotsExists: false,
          robotsAllowsUs: true,
          crawlDelayMs: null,
          sitemapUrls: [],
          outcome: "dead",
          error: err instanceof Error ? err.message : String(err),
          checkedAt: new Date().toISOString(),
        };
      }

      results.push(result);
      done += 1;
      onResult?.(result, done, sources.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, sources.length) }, worker),
  );

  return results;
}
