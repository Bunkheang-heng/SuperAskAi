/**
 * Content monitoring CLI (FR-47, FR-49, FR-54).
 *
 *   npx tsx scripts/crawl.ts --mode=verify              probe every seed, write nothing else
 *   npx tsx scripts/crawl.ts --mode=monitor             change detection, confirmed sources
 *   npx tsx scripts/crawl.ts --mode=monitor --priority=1
 *   npx tsx scripts/crawl.ts --mode=monitor --only=SRC-015,SRC-034
 *   npx tsx scripts/crawl.ts --mode=monitor --dry-run   fetch and compare, persist nothing
 *
 * Run verify FIRST on a fresh registry. 51 of the 130 entries are unproven
 * leads and monitor skips them by default until a probe confirms them.
 */

import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { crawl, loadSources } from "../lib/monitor/crawl";
import { verifyAll } from "../lib/monitor/verify";
import { USER_AGENT } from "../lib/monitor/fetch";
import type { VerificationResult } from "../lib/monitor/types";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=").slice(1).join("=");
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const OUT_DIR = join(process.cwd(), "data", "crawl");

async function runVerify() {
  const all = loadSources();
  const priority = arg("priority")?.split(",").map(Number);
  const sources = all.filter(
    (s) => s.enabled && (!priority || priority.includes(s.priority)),
  );

  console.log(`\nSeed verification — ${sources.length} sources`);
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log("=".repeat(78));

  // Persist each result as it arrives, not just at the end. A run that dies on
  // the last host — which is exactly what happened the first time — otherwise
  // throws away twenty minutes of probing that was already complete.
  mkdirSync(OUT_DIR, { recursive: true });
  const partial = join(OUT_DIR, "verification.partial.jsonl");
  writeFileSync(partial, "", "utf8");

  const results = await verifyAll(sources, undefined, (r, done, total) => {
    appendFileSync(partial, JSON.stringify(r) + "\n", "utf8");
    const mark = { live: "ok  ", empty: "EMPTY", redirect: "→   ", dead: "DEAD", blocked: "BLOCK" }[
      r.outcome
    ];
    const detail =
      r.outcome === "redirect"
        ? ` → ${r.finalUrl}`
        : r.outcome === "dead"
          ? ` (${r.httpStatus || r.error || "no response"})`
          : r.outcome === "empty"
            ? ` (${r.textLength} chars)`
            : "";
    console.log(
      `[${String(done).padStart(3)}/${total}] ${mark} ${r.host.padEnd(34)} P${r.priority} ${r.claimed.padEnd(12)}${detail}`,
    );
  });

  results.sort((a, b) => a.registryId - b.registryId);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "verification.json"),
    JSON.stringify(results, null, 2),
    "utf8",
  );
  writeFileSync(join(OUT_DIR, "verification.csv"), toCsv(results), "utf8");

  summarise(results);
}

function toCsv(results: VerificationResult[]): string {
  const cols: Array<keyof VerificationResult> = [
    "registryId", "sourceId", "org", "host", "priority", "claimed", "outcome",
    "httpStatus", "finalUrl", "redirected", "offHost", "https", "homepageTitle",
    "textLength", "robotsExists", "robotsAllowsUs", "crawlDelayMs", "checkedAt", "error",
  ];

  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return [
    cols.join(","),
    ...results.map((r) => cols.map((c) => esc(r[c])).join(",")),
    "",
  ].join("\n");
}

function summarise(results: VerificationResult[]) {
  const by = (k: VerificationResult["outcome"]) =>
    results.filter((r) => r.outcome === k);

  console.log("=".repeat(78));
  console.log(`\nlive      ${by("live").length}`);
  console.log(`redirect  ${by("redirect").length}`);
  console.log(`empty     ${by("empty").length}`);
  console.log(`dead      ${by("dead").length}`);
  console.log(`blocked   ${by("blocked").length}`);

  // The point of the exercise: which unproven leads turned out to be real.
  const leads = results.filter((r) => r.claimed === "unconfirmed");
  const confirmed = leads.filter((r) => r.outcome === "live");
  console.log(
    `\nunconfirmed leads: ${confirmed.length} of ${leads.length} resolved live`,
  );
  for (const r of confirmed) console.log(`  + ${r.host.padEnd(34)} ${r.homepageTitle.slice(0, 40)}`);

  // Redirects are how an alias is told apart from a separate organisation.
  const redirects = results.filter((r) => r.offHost);
  if (redirects.length) {
    console.log(`\ncanonical resolutions (${redirects.length}):`);
    for (const r of redirects) console.log(`  ${r.host} → ${r.finalUrl}`);
  }

  const blocked = by("blocked");
  if (blocked.length) {
    console.log(`\nrobots.txt disallows us (${blocked.length}):`);
    for (const r of blocked) console.log(`  ${r.host}`);
  }

  console.log(`\nWritten: data/crawl/verification.{json,csv}`);
  console.log(
    `Nothing was ingested. Confirmed leads still need their registry row updated\n` +
      `in data/registry/seed_registry.py, then: npx tsx scripts/build-sources.ts\n`,
  );
}

async function runMonitor() {
  const report = await crawl({
    only: arg("only")?.split(","),
    priority: arg("priority")?.split(",").map(Number),
    includeUnconfirmed: flag("include-unconfirmed"),
    dryRun: flag("dry-run"),
    onProgress: (line) => console.log(line),
  });

  console.log("\n" + "=".repeat(78));
  console.log(`sources    ${report.sourcesReachable}/${report.sourcesAttempted} reachable`);
  console.log(`pages      ${report.pagesFetched} fetched, ${report.pagesBlockedByRobots} blocked by robots`);
  console.log(
    `changes    ${report.changes.total} (${report.changes.factual} factual, ${report.changes.presentation} presentation)`,
  );
  console.log(
    `           new ${report.changes.byKind.new} · modified ${report.changes.byKind.modified} · removed ${report.changes.byKind.removed}`,
  );

  if (report.errors.length) {
    console.log(`\nerrors (${report.errors.length}):`);
    for (const e of report.errors) console.log(`  ${e.sourceId}  ${e.error}`);
  }

  if (flag("dry-run")) {
    console.log("\nDry run — nothing written.\n");
  } else {
    console.log(
      `\n${report.changes.total} change signals raised to data/crawl/review-queue.jsonl.\n` +
        `Nothing was published. A steward approves before any of this reaches a citizen (FR-49).\n`,
    );
  }
}

const mode = arg("mode") ?? "verify";

if (mode === "verify") {
  runVerify();
} else if (mode === "monitor") {
  runMonitor();
} else {
  console.error(`Unknown --mode=${mode}. Expected "verify" or "monitor".`);
  process.exitCode = 1;
}
