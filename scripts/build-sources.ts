/**
 * data/registry/websites_master.csv → data/sources.json
 *
 * The registry is maintained upstream in Python (data/registry/seed_registry.py
 * → build_dataset.py, which emits CSV, XLSX, JSON and SQL). This script is the
 * one-way bridge into the shape lib/monitor/ consumes, so the Python remains
 * the single place a source is added or corrected and this file is never edited
 * by hand.
 *
 * The master CSV carries one row per source: the organisation record, its crawl
 * seed under seed_*, and the last probe result under verify_* (written back by
 * scripts/crawl.ts --mode=verify). Only the first two groups are read here — a
 * probe result describes a source, it does not decide whether to monitor it.
 *
 * Two registry columns decide whether a source is crawled at all, and both are
 * honoured rather than flattened away:
 *
 *   verified = unconfirmed  → the domain was DERIVED from a naming convention
 *     (<province>.gov.kh and similar), not observed. build_dataset.py is explicit
 *     that these are leads, not facts, and must not be ingested before a crawl
 *     confirms them. They are kept enabled, because probing them IS the
 *     confirmation step, but they are marked so nothing downstream can mistake
 *     a lead for a source.
 *
 *   render_mode = headless  → a client-rendered SPA. A static fetch returns an
 *     empty shell, so crawling it would record "no content" as though that were
 *     the page. Disabled with a reason rather than silently producing garbage.
 *
 * Run: npx tsx scripts/build-sources.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toRecords } from "../lib/registry/csv";

const REGISTRY = join(process.cwd(), "data", "registry");

const full = toRecords(
  readFileSync(join(REGISTRY, "websites_master.csv"), "utf8"),
);

/**
 * Page budget by crawl priority.
 *
 * The registry sets max_depth 4 for every source uniformly. Depth alone is not
 * a budget — depth 4 on a news site is unbounded — so the real limit is pages,
 * and it is spent where the citizen-facing answers are. build_dataset.py §7
 * names the priority-1 set: MoI, MoJ, MPWT, MLMUPC, MoSVY, NSSF, GDT.
 */
const PAGE_BUDGET: Record<string, number> = { "1": 60, "2": 25, "3": 10 };

interface OutSource {
  id: string;
  registryId: number;
  org: string;
  orgKm?: string;
  abbr?: string;
  category: string;
  parentMinistry?: string;
  url: string;
  host: string;
  adapter: "web";
  priority: number;
  verified: string;
  renderMode: string;
  depth: number;
  maxPages: number;
  politenessDelayMs: number;
  enabled: boolean;
  disabledReason?: string;
  /**
   * Known access obstacle that does NOT stop the source being monitored.
   *
   * Separate from disabledReason on purpose: "we cannot read this today" and
   * "do not attempt this" are different statements, and only the second one
   * should remove a source from the run.
   */
  accessNote?: string;
  kbMinistry?: string;
  notes?: string;
}

/** Ministries whose content is already in data/kb/ — a change is live-affecting. */
const ONBOARDED: Record<string, string> = {
  "interior.gov.kh": "Ministry of Interior",
  "mpwt.gov.kh": "Ministry of Public Works and Transport",
};

const sources: OutSource[] = full.map((r) => {
  const host = [r.subdomain, r.domain].filter(Boolean).join(".");
  const priority = Number(r.crawl_priority || "3");
  const renderMode = r.seed_render_mode || "static";
  const headless = renderMode === "headless";
  // status=waf-blocked — the host rejects automated clients outright. Distinct
  // from verify_outcome=blocked, which in this codebase means robots.txt
  // forbids us (lib/monitor/types.ts).
  //
  // This used to disable the source, on the reasoning that a crawler trusting
  // the status code would record the rejection page as content and burn the
  // page budget on refusals. Both of those are now handled where they belong,
  // in the crawler: lib/monitor/soft-block.ts recognises a WAF page, and
  // lib/monitor/robots.ts fails closed when /robots.txt returns one — which
  // costs a single request per run and stops before the seed is even fetched.
  //
  // So the source stays ENABLED and monitored. Disabling it would have made
  // AskGov's registry quietly disagree with reality: the site is a priority-1
  // acquisition target, and the moment the owning institution allowlists
  // AskGovBot the crawler must pick it up without anyone remembering to flip a
  // flag. A run reports it as refused every week, which is the honest state.
  const wafBlocked = (r.status || "").trim() === "waf-blocked";

  return {
    id: `SRC-${r.id.padStart(3, "0")}`,
    registryId: Number(r.id),
    org: r.organization_name,
    orgKm: r.khmer_name || undefined,
    abbr: r.abbreviation || undefined,
    category: r.category,
    parentMinistry: r.parent_ministry || undefined,
    url: r.base_url || r.seed_url || `https://${host}`,
    host,
    adapter: "web" as const,
    priority,
    verified: r.verified || "unconfirmed",
    renderMode,
    depth: Number(r.seed_max_depth || "4"),
    maxPages: PAGE_BUDGET[String(priority)] ?? 10,
    politenessDelayMs: Number(r.seed_politeness_delay_s || "2") * 1000,
    enabled: !headless,
    disabledReason: headless
      ? "render_mode=headless — client-rendered SPA; a static fetch returns an empty shell. Needs a headless adapter."
      : undefined,
    accessNote: wafBlocked
      ? "status=waf-blocked — the host answers automated clients with a WAF rejection page carrying HTTP 200. The crawler detects and reports this rather than recording it; getting real access is a Section 2.6 institutional matter, not a crawler setting."
      : undefined,
    kbMinistry: ONBOARDED[host],
    notes: r.notes || undefined,
  };
});

const byVerified = sources.reduce<Record<string, number>>((acc, s) => {
  acc[s.verified] = (acc[s.verified] ?? 0) + 1;
  return acc;
}, {});

const out = {
  _comment:
    "GENERATED — do not edit by hand. Source of truth is data/registry/seed_registry.py; regenerate with `npx tsx scripts/build-sources.ts`. Monitored source registry for FR-47, organised by platform per section 10.4 with organisation identity as metadata.",
  _gateNote:
    "A crawl produces a CHANGE SIGNAL and nothing else (FR-49). Detected changes land in var/review-queue.jsonl for the responsible steward. Nothing here reaches a citizen, or data/kb/, without steward approval — and fees, deadlines, required documents, eligibility and procedure steps need that approval even when the change is unambiguous (section 10.5).",
  _verifiedNote:
    "verified=directory|wikipedia|search are observed domains. verified=unconfirmed were DERIVED from a naming convention and are leads, not facts: probing them is how they get confirmed, and nothing from an unconfirmed source may be ingested until its homepage returns 2xx and confirms ownership.",
  generatedAt: new Date().toISOString().slice(0, 10),
  counts: {
    total: sources.length,
    enabled: sources.filter((s) => s.enabled).length,
    byVerified: byVerified,
    byPriority: sources.reduce<Record<string, number>>((acc, s) => {
      acc[s.priority] = (acc[s.priority] ?? 0) + 1;
      return acc;
    }, {}),
  },
  sources,
};

writeFileSync(
  join(process.cwd(), "data", "sources.json"),
  JSON.stringify(out, null, 2),
  "utf8",
);

console.log(`\ndata/sources.json — ${sources.length} sources`);
console.log(`  enabled          ${out.counts.enabled}`);
console.log(`  disabled         ${sources.length - out.counts.enabled} (headless)`);
console.log(
  `  access notes     ${sources.filter((s) => s.accessNote).length} (monitored, but the host refuses automated clients)`,
);
console.log(`  by provenance    ${JSON.stringify(byVerified)}`);
console.log(`  by priority      ${JSON.stringify(out.counts.byPriority)}`);
console.log(
  `  page budget      P1 ${PAGE_BUDGET["1"]} · P2 ${PAGE_BUDGET["2"]} · P3 ${PAGE_BUDGET["3"]}`,
);
console.log(
  `  worst-case pages ${sources.filter((s) => s.enabled).reduce((n, s) => n + s.maxPages, 0)}\n`,
);
