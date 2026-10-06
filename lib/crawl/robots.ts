/**
 * robots.txt — fetched once per host per run, then honoured.
 *
 * Not optional and not a formality. These are government servers, and the
 * exclusion protocol is the only standing instruction their operators have
 * given about automated access. A crawler that ignores it is not monitoring,
 * it is scraping against the site owner's expressed wishes.
 *
 * Fail-open on a MISSING robots.txt (404 or unreachable) because absence means
 * no restriction was stated. Fail-CLOSED on a 401 or 403 for robots.txt itself:
 * a host that refuses to show its rules is not inviting a guess.
 *
 * A third case sits between those two and used to be handled as neither: a
 * host that answers /robots.txt with 200 and something that is not robots.txt.
 * Both observed shapes — a WAF rejection page and a single-page app's catch-all
 * shell — parse to zero directives, and zero directives reads as "no rules,
 * crawl freely". That is a guess wearing a rule's clothes. The body is now
 * sniffed (lib/crawl/soft-block.ts): a WAF page is a refusal and fails
 * closed, anything else unreadable is treated as absent and fails open, and
 * either way the reason is recorded rather than inferred.
 */

import { politeFetch, MIN_HOST_DELAY_MS } from "./fetch";
import { detectSoftBlock, looksLikeRobotsTxt } from "./soft-block";

interface Group {
  /** Longest-match wins between Allow and Disallow, per the usual convention. */
  allow: string[];
  disallow: string[];
  crawlDelayMs: number | null;
}

export interface Robots {
  isAllowed(url: string): boolean;
  crawlDelayMs: number;
  /** No rules could be read and the host refused to say — treat as disallowed. */
  blocked: boolean;
  /**
   * How this verdict was reached, when it was not simply "we read the file".
   *
   * Carried so the crawl report can say *why* a source was skipped. "Blocked"
   * alone cannot distinguish a ministry that deliberately excluded us from a
   * WAF that would refuse anyone, and those two want opposite responses: the
   * first is a rule to honour, the second is a conversation to have.
   */
  note?: string;
}

const ALLOW_ALL: Robots = {
  isAllowed: () => true,
  crawlDelayMs: MIN_HOST_DELAY_MS,
  blocked: false,
};

const BLOCK_ALL: Robots = {
  isAllowed: () => false,
  crawlDelayMs: MIN_HOST_DELAY_MS,
  blocked: true,
};

const withNote = (base: Robots, note: string): Robots => ({ ...base, note });

/**
 * Match a robots path pattern, supporting the `*` and `$` extensions that are
 * near-universal in practice.
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  return escaped.endsWith("\\$")
    ? new RegExp(`^${escaped.slice(0, -2)}$`)
    : new RegExp(`^${escaped}`);
}

/**
 * Parse robots.txt into the group that applies to us.
 *
 * A specific `User-agent: SuperAskBot` group wins over `User-agent: *` outright —
 * that is the whole point of naming the crawler honestly. If an operator writes
 * a rule for us, it must beat the wildcard.
 */
function parse(text: string, agent: string): Group {
  const wildcard: Group = { allow: [], disallow: [], crawlDelayMs: null };
  const specific: Group = { allow: [], disallow: [], crawlDelayMs: null };

  let active: Group[] = [];
  let lastLineWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;

    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      // Consecutive User-agent lines share one rule block.
      if (!lastLineWasAgent) active = [];
      const ua = value.toLowerCase();
      if (ua === "*") active.push(wildcard);
      else if (agent.toLowerCase().includes(ua)) active.push(specific);
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (active.length === 0) continue;

    for (const group of active) {
      if (field === "disallow") {
        // "Disallow:" with an empty value means allow everything.
        if (value) group.disallow.push(value);
      } else if (field === "allow") {
        if (value) group.allow.push(value);
      } else if (field === "crawl-delay") {
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds > 0) {
          group.crawlDelayMs = seconds * 1000;
        }
      }
    }
  }

  const chosen =
    specific.allow.length || specific.disallow.length || specific.crawlDelayMs
      ? specific
      : wildcard;

  return chosen;
}

function toRobots(group: Group): Robots {
  const allow = group.allow.map((p) => ({ len: p.length, re: patternToRegex(p) }));
  const disallow = group.disallow.map((p) => ({
    len: p.length,
    re: patternToRegex(p),
  }));

  return {
    crawlDelayMs: Math.max(group.crawlDelayMs ?? 0, MIN_HOST_DELAY_MS),
    blocked: false,
    isAllowed(url: string) {
      const path = new URL(url).pathname + new URL(url).search;

      let bestAllow = -1;
      for (const a of allow) if (a.re.test(path) && a.len > bestAllow) bestAllow = a.len;

      let bestDisallow = -1;
      for (const d of disallow) {
        if (d.re.test(path) && d.len > bestDisallow) bestDisallow = d.len;
      }

      if (bestDisallow === -1) return true;
      // Ties go to Allow, which is the documented behaviour.
      return bestAllow >= bestDisallow;
    },
  };
}

const cache = new Map<string, Robots>();

export async function getRobots(url: string, agent: string): Promise<Robots> {
  const origin = new URL(url).origin;
  const cached = cache.get(origin);
  if (cached) return cached;

  const res = await politeFetch(`${origin}/robots.txt`, MIN_HOST_DELAY_MS);

  const softBlock =
    res.status === 200 ? detectSoftBlock(res.body, res.contentType) : null;

  let robots: Robots;
  if (res.status === 401 || res.status === 403) {
    robots = withNote(BLOCK_ALL, `robots.txt refused with HTTP ${res.status}`);
  } else if (softBlock?.kind === "waf") {
    // The host is refusing automated clients outright, and it is refusing them
    // at the one URL whose whole purpose is to state the terms of automated
    // access. Fail closed for the same reason a 403 does: we were not told the
    // rules, so we do not get to invent permissive ones.
    robots = withNote(BLOCK_ALL, `robots.txt returned a WAF page (${softBlock.detail})`);
  } else if (res.status !== 200 || !res.body.trim()) {
    robots = ALLOW_ALL;
  } else if (!looksLikeRobotsTxt(res.body)) {
    // 200, but the body holds no directives — almost always a catch-all route
    // serving an app shell. No restriction was stated, so this is the same
    // situation as a 404, and it fails open like one.
    robots = withNote(ALLOW_ALL, "robots.txt served a non-robots body; treated as absent");
  } else {
    robots = toRobots(parse(res.body, agent));
  }

  cache.set(origin, robots);
  return robots;
}

/** Test seam — the cache is per-process and a long-lived process would go stale. */
export function clearRobotsCache(): void {
  cache.clear();
}
