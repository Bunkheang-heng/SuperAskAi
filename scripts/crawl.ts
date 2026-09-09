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

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { crawl, loadSources } from "../lib/monitor/crawl";
import { verifyAll } from "../lib/monitor/verify";
import { USER_AGENT } from "../lib/monitor/fetch";
import { parseCsv, toRecords, fromRecords } from "../lib/registry/csv";
import type { VerificationResult } from "../lib/monitor/types";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=").slice(1).join("=");
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const OUT_DIR = join(process.cwd(), "data", "crawl");
const MASTER = join(process.cwd(), "data", "registry", "websites_master.csv");

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
    const mark = {
      live: "ok  ",
      empty: "EMPTY",
      redirect: "→   ",
      dead: "DEAD",
      blocked: "BLOCK",
      rejected: "REJCT",
    }[r.outcome];
    const detail =
      r.outcome === "redirect"
        ? ` → ${r.finalUrl}`
        : r.outcome === "dead"
          ? ` (${r.httpStatus || r.error || "no response"})`
          : r.outcome === "empty"
            ? ` (${r.textLength} chars)`
            : r.outcome === "rejected" || r.outcome === "blocked"
              ? ` (${r.softBlock ?? "robots.txt"})`
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
  const written = writeBackToMaster(results);

  summarise(results, written);
}

/**
 * Probe results belong on the source's own row, not in a second file that has
 * to be joined back by hand. Only the verify_* columns are touched, and only
 * for the sources this run actually probed — a --priority=1 run must not blank
 * out what the last full run learned about everything else.
 */
function writeBackToMaster(results: VerificationResult[]): number {
  const cols: Array<keyof VerificationResult> = [
    "sourceId", "outcome", "httpStatus", "finalUrl", "redirected", "offHost",
    "https", "homepageTitle", "textLength", "robotsExists", "robotsAllowsUs",
    "crawlDelayMs", "checkedAt", "softBlock", "error",
  ];

  const text = readFileSync(MASTER, "utf8");
  const header = parseCsv(text)[0];
  const records = toRecords(text);
  const byId = new Map(records.map((r) => [r.id, r]));

  for (const c of cols) {
    if (!header.includes(`verify_${c}`)) header.push(`verify_${c}`);
  }

  let written = 0;
  const orphans: number[] = [];
  for (const r of results) {
    const row = byId.get(String(r.registryId));
    if (!row) {
      orphans.push(r.registryId);
      continue;
    }
    for (const c of cols) {
      const v = r[c];
      row[`verify_${c}`] = v === undefined || v === null ? "" : String(v);
    }
    written += 1;
  }

  if (orphans.length) {
    console.warn(
      `\nWARNING: ${orphans.length} probe result(s) had no registry row and were dropped: ${orphans.join(", ")}`,
    );
  }

  writeFileSync(MASTER, fromRecords(header, records), "utf8");
  return written;
}

function summarise(results: VerificationResult[], written: number) {
  const by = (k: VerificationResult["outcome"]) =>
    results.filter((r) => r.outcome === k);

  console.log("=".repeat(78));
  console.log(`\nlive      ${by("live").length}`);
  console.log(`redirect  ${by("redirect").length}`);
  console.log(`empty     ${by("empty").length}`);
  console.log(`dead      ${by("dead").length}`);
  console.log(`blocked   ${by("blocked").length}`);
  console.log(`rejected  ${by("rejected").length}`);

  // A 200 that carried a refusal. Worth its own block because the remedy is
  // never technical: these hosts are working and are declining an automated
  // client, which is a conversation with the owning institution (section 2.6).
  const rejected = by("rejected");
  if (rejected.length) {
    console.log(`\nrefused with HTTP 200 (${rejected.length}):`);
    for (const r of rejected) {
      console.log(`  ${r.host.padEnd(34)} ${r.softBlock ?? ""}`);
    }
  }

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

  // "Blocked" covers two situations that call for opposite responses, and
  // printing them in one list hid that. A ministry that wrote a Disallow rule
  // has told us its terms and we honour them — nothing to do. A host whose
  // robots.txt is itself a WAF rejection has told us nothing; it is refusing
  // every automated client, and the remedy is an institutional conversation
  // (section 2.6), not a crawler setting.
  const blocked = by("blocked");
  const wafBlocked = blocked.filter((r) => /WAF page/i.test(r.softBlock ?? ""));
  const ruleBlocked = blocked.filter((r) => !wafBlocked.includes(r));

  if (ruleBlocked.length) {
    console.log(`\nrobots.txt disallows us (${ruleBlocked.length}):`);
    for (const r of ruleBlocked) {
      console.log(`  ${r.host.padEnd(34)} ${r.softBlock ?? "Disallow rule"}`);
    }
  }

  if (wafBlocked.length) {
    console.log(
      `\nWAF refuses us — robots.txt itself returns a rejection page (${wafBlocked.length}):`,
    );
    for (const r of wafBlocked) console.log(`  ${r.host}`);
    console.log(
      `  These hosts are up and serving citizens; they decline AskGovBot. Not a\n` +
        `  crawler defect and not fixable by retrying — raise access with the owning\n` +
        `  institution (section 2.6).`,
    );
  }

  console.log(`\nWritten: data/crawl/verification.json`);
  console.log(
    `         data/registry/websites_master.csv — verify_* columns on ${written} row(s)`,
  );
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
  console.log(
    `pages      ${report.pagesFetched} fetched, ${report.pagesBlockedByRobots} blocked by robots, ` +
      `${report.pagesRejected} refused with 200`,
  );
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
