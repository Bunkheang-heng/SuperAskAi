/**
 * Retrieval and refusal evaluation harness.
 *
 * ── WHY THIS EXISTS AND WHY IT RUNS FIRST ──────────────────────────────────
 * Section 13 is explicit: generation work shall not commence before retrieval
 * recall meets the Phase 0 threshold, because a system with strong generation
 * and weak retrieval produces confident incorrect answers — a worse outcome for
 * a government service than no service at all.
 *
 * So retrieval is measured WITHOUT generation. No model is called by this
 * script. It reports, against the golden question set:
 *
 *   M-03  Retrieval recall at 8   — target ≥ 85%
 *   M-04  Refusal precision        — target ≥ 98%
 *
 * Plus MRR and recall at 1 and 3, which are what actually tell you whether the
 * reranker is working or whether the right chunk is merely somewhere in the pile.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Run: npm run eval
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { retrieve } from "../lib/retrieval";
import { screen, isOffDomain } from "../lib/engine/guardrails";

interface Golden {
  positives: Array<{ q: string; expect: string }>;
  negatives: Array<{ q: string; reason: string }>;
}

const RETRIEVAL_MIN_SCORE = Number(process.env.RETRIEVAL_MIN_SCORE ?? "0.20");

const golden = JSON.parse(
  readFileSync(join(process.cwd(), "data", "golden.json"), "utf8"),
) as Golden;

function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}%`;
}

function bar(value: number, target: number): string {
  return value >= target ? "PASS" : "FAIL";
}

// ── Retrieval ──────────────────────────────────────────────────────────────

let at1 = 0;
let at3 = 0;
let at8 = 0;
let mrrSum = 0;
const misses: Array<{ q: string; expect: string; got: string[] }> = [];
/** Top rerank score per in-scope question, for threshold selection. */
const positiveTopScores: number[] = [];

for (const { q, expect } of golden.positives) {
  const { candidates, topScore } = retrieve(q, [], 8);
  const ids = candidates.map((c) => c.chunk.id);
  const rank = ids.indexOf(expect);

  positiveTopScores.push(topScore);

  if (rank === 0) at1 += 1;
  if (rank >= 0 && rank < 3) at3 += 1;
  if (rank >= 0 && rank < 8) at8 += 1;
  if (rank >= 0) mrrSum += 1 / (rank + 1);
  else misses.push({ q, expect, got: ids.slice(0, 3) });
}

const total = golden.positives.length;

// ── Refusal ────────────────────────────────────────────────────────────────
// A negative is correctly handled when it is refused, and the live path has
// THREE gates that can refuse it. They are applied here in the same order
// lib/engine/tiers.ts applies them, because a harness that models a different
// order measures a system nobody is running:
//
//   1. screen()      §12 refusal policy               tiers.ts:313
//   2. isOffDomain() positive scope gate              tiers.ts:369
//   3. retrieval floor below RETRIEVAL_MIN_SCORE      FR-16
//
// Gate 2 was previously absent from this harness, which understated M-04: "what
// is the capital of france" scores 0.205 against a 0.200 floor and was counted
// as a leak, while the running service refuses it as scope:not_a_service_question
// before retrieval is ever consulted. Adding it measures what the service does
// rather than lowering the bar — a question the scope gate does not catch still
// has to clear the floor exactly as before.

let refused = 0;
const leaks: Array<{ q: string; reason: string; topScore: number; top: string }> =
  [];
/** Which gate caught each refusal, so a shift between them is visible. */
const refusedBy = { policy: 0, scope: 0, floor: 0 };
/** Top rerank score per out-of-scope question that no gate caught. */
const negativeTopScores: number[] = [];

for (const { q, reason } of golden.negatives) {
  const hit = screen(q);
  if (hit) {
    refused += 1;
    refusedBy.policy += 1;
    continue;
  }

  // The golden negatives are single questions with no conversation behind
  // them, which is the same thing the live path sees on a first turn.
  if (isOffDomain(q, [])) {
    refused += 1;
    refusedBy.scope += 1;
    continue;
  }

  const { candidates, topScore } = retrieve(q, [], 8);
  negativeTopScores.push(topScore);

  if (candidates.length === 0 || topScore < RETRIEVAL_MIN_SCORE) {
    refused += 1;
    refusedBy.floor += 1;
    continue;
  }

  leaks.push({
    q,
    reason,
    topScore: Number(topScore.toFixed(3)),
    top: candidates[0].chunk.id,
  });
}

/**
 * Threshold selection (FR-16).
 *
 * The escalation floor trades two error types against each other: too low and
 * out-of-scope questions get answered from irrelevant sources; too high and
 * in-scope questions escalate to a human who did not need to be involved.
 *
 * For a government service the asymmetry is not close — a confident wrong answer
 * about a fee or a deadline is the R-02 harm the platform exists to avoid, while
 * an unnecessary escalation costs an officer a few minutes. So the sweep reports
 * both columns and the threshold is chosen from evidence rather than taste.
 */
function sweep() {
  const rows: Array<{
    t: number;
    answered: number;
    refusedNeg: number;
  }> = [];

  for (let t = 0.10; t <= 0.45001; t += 0.025) {
    rows.push({
      t: Number(t.toFixed(3)),
      answered: positiveTopScores.filter((s) => s >= t).length,
      refusedNeg:
        golden.negatives.length -
        negativeTopScores.filter((s) => s >= t).length,
    });
  }

  return rows;
}

// ── Report ─────────────────────────────────────────────────────────────────

const recall8 = at8 / total;
const refusalPrecision = refused / golden.negatives.length;

console.log("\nSuperAsk — retrieval and refusal evaluation");
console.log("=".repeat(62));
console.log(`Golden positives : ${total}`);
console.log(`Golden negatives : ${golden.negatives.length}`);
console.log(`Escalation floor : ${RETRIEVAL_MIN_SCORE} (RETRIEVAL_MIN_SCORE)`);
console.log("-".repeat(62));
console.log(`Recall @1        : ${pct(at1, total)}`);
console.log(`Recall @3        : ${pct(at3, total)}`);
console.log(
  `Recall @8  M-03  : ${pct(at8, total)}   target 85.0%   ${bar(recall8, 0.85)}`,
);
console.log(`MRR              : ${(mrrSum / total).toFixed(3)}`);
console.log(
  `Refusal    M-04  : ${pct(refused, golden.negatives.length)}   target 98.0%   ${bar(refusalPrecision, 0.98)}`,
);
console.log(
  `  by gate        : policy ${refusedBy.policy} · scope ${refusedBy.scope} · floor ${refusedBy.floor}`,
);
console.log("=".repeat(62));

const sortedPos = [...positiveTopScores].sort((a, b) => a - b);
console.log("\nIn-scope top-score distribution (threshold selection):");
console.log(
  `  min ${sortedPos[0].toFixed(3)}   p10 ${sortedPos[Math.floor(total * 0.1)].toFixed(3)}   median ${sortedPos[Math.floor(total * 0.5)].toFixed(3)}   max ${sortedPos[total - 1].toFixed(3)}`,
);

console.log("\nEscalation-floor sweep:");
console.log("  floor   in-scope answered   out-of-scope refused");
for (const r of sweep()) {
  const answeredPct = pct(r.answered, total);
  const refusedPct = pct(r.refusedNeg, golden.negatives.length);
  const marker = r.t === RETRIEVAL_MIN_SCORE ? "  <- configured" : "";
  console.log(
    `  ${r.t.toFixed(3)}   ${answeredPct.padStart(16)}   ${refusedPct.padStart(20)}${marker}`,
  );
}

if (misses.length > 0) {
  console.log(`\nRetrieval misses (${misses.length}):`);
  for (const m of misses) {
    console.log(`  "${m.q}"`);
    console.log(`     expected ${m.expect}, top3 ${m.got.join(", ") || "(none)"}`);
  }
}

if (leaks.length > 0) {
  console.log(`\nOut-of-scope questions NOT refused (${leaks.length}):`);
  for (const l of leaks) {
    console.log(`  "${l.q}"`);
    console.log(
      `     expected refusal (${l.reason}), got ${l.top} at ${l.topScore}`,
    );
  }
}

console.log(
  "\nNote: this measures retrieval and refusal only. No model was called.",
);
console.log(
  "Groundedness (M-01) and uncited-claim count (M-02) require graded",
);
console.log("answers against this set — see the Data Labeling Center (D-05).\n");

// Non-zero exit on a threshold miss, so this can gate a pipeline (NFR-19).
if (recall8 < 0.85 || refusalPrecision < 0.98) process.exitCode = 1;
