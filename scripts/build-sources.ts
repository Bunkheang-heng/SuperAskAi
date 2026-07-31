/**
 * data/registry/*.csv → data/sources.json
 *
 * The registry is maintained upstream in Python (data/registry/seed_registry.py
 * → build_dataset.py, which emits CSV, XLSX, JSON and SQL). This script is the
 * one-way bridge into the shape lib/monitor/ consumes, so the Python remains
 * the single place a source is added or corrected and this file is never edited
 * by hand.
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

const REGISTRY = join(process.cwd(), "data", "registry");

/** RFC 4180 — fields may contain commas, quotes and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM; build_dataset.py writes utf-8-sig for Excel.
  const s = text.replace(/^﻿/, "");

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];

    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // handled by \n
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function toRecords(csv: string): Array<Record<string, string>> {
  const rows = parseCsv(csv);
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (r[i] ?? "").trim()));
    return rec;
  });
}

const full = toRecords(
  readFileSync(join(REGISTRY, "government_websites.csv"), "utf8"),
);
const seeds = toRecords(readFileSync(join(REGISTRY, "crawl_seeds.csv"), "utf8"));
const seedById = new Map(seeds.map((s) => [s.id, s]));

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
  kbMinistry?: string;
  notes?: string;
}

/** Ministries whose content is already in data/kb/ — a change is live-affecting. */
const ONBOARDED: Record<string, string> = {
  "interior.gov.kh": "Ministry of Interior",
  "mpwt.gov.kh": "Ministry of Public Works and Transport",
};

const sources: OutSource[] = full.map((r) => {
  const seed = seedById.get(r.id);
  const host = [r.subdomain, r.domain].filter(Boolean).join(".");
  const priority = Number(r.crawl_priority || seed?.crawl_priority || "3");
  const renderMode = seed?.render_mode ?? "static";
  const headless = renderMode === "headless";

  return {
    id: `SRC-${r.id.padStart(3, "0")}`,
    registryId: Number(r.id),
    org: r.organization_name,
    orgKm: r.khmer_name || undefined,
    abbr: r.abbreviation || undefined,
    category: r.category,
    parentMinistry: r.parent_ministry || undefined,
    url: r.base_url || seed?.seed_url || `https://${host}`,
    host,
    adapter: "web" as const,
    priority,
    verified: r.verified || seed?.verified || "unconfirmed",
    renderMode,
    depth: Number(seed?.max_depth ?? "4"),
    maxPages: PAGE_BUDGET[String(priority)] ?? 10,
    politenessDelayMs: Number(seed?.politeness_delay_s ?? "2") * 1000,
    enabled: !headless,
    disabledReason: headless
      ? "render_mode=headless — client-rendered SPA; a static fetch returns an empty shell. Needs a headless adapter."
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
console.log(`  by provenance    ${JSON.stringify(byVerified)}`);
console.log(`  by priority      ${JSON.stringify(out.counts.byPriority)}`);
console.log(
  `  page budget      P1 ${PAGE_BUDGET["1"]} · P2 ${PAGE_BUDGET["2"]} · P3 ${PAGE_BUDGET["3"]}`,
);
console.log(
  `  worst-case pages ${sources.filter((s) => s.enabled).reduce((n, s) => n + s.maxPages, 0)}\n`,
);
