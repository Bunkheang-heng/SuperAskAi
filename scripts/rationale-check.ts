/**
 * Rationale gate check.
 *
 * The gate exists because the FR-15 verification gate cannot catch the failure
 * it addresses. A citizen asked why the late penalty on licence renewal exists;
 * the corpus holds the rule, its rate and its trigger, and states no reason for
 * any of it. The answer restated the rule as its own justification:
 *
 *   "The late fee applies because the regulation provides that a licence
 *    expired for more than 30 days is subject to a daily penalty on renewal."
 *
 * Every clause there is supported by the source, so verification passes it
 * without complaint — verification checks that claims are SUPPORTED, not that
 * they are INFORMATIVE, and a tautology is perfectly supported. Nothing else in
 * the pipeline distinguished "the source states the rule" from "the source
 * explains the rule", so the citizen asked "but why though?" and received a
 * byte-identical answer.
 *
 * So this gate needs its own evidence, separate from the verification harness,
 * and it needs re-running whenever the marker lists change. Like
 * verify-check.ts this is a pure-function harness: no model is called, so it
 * runs in CI with no credential configured.
 *
 * Run: npx tsx scripts/rationale-check.ts
 */

import {
  seeksRationale,
  explainsRationale,
  rationaleGap,
} from "../lib/engine/rationale";

/**
 * Real corpus text, quoted from the chunks the failure actually involved.
 * MPWT-DL-008 states the penalty and gives no reason for it; the NBC chunk is
 * the stray purpose clause that must NOT be allowed to satisfy the check for an
 * unrelated question.
 */
const RULE_WITHOUT_REASON =
  "If the licence has been expired for more than 30 days, a penalty of 500 riel per day applies for small vehicles and 2,000 riel per day for large vehicles.";

const RULE_WITH_REASON =
  "A daily penalty applies to late renewal in order to keep the licence register current and discourage driving on an expired licence.";

const UNRELATED_WITH_REASON =
  "Interest rate caps on consumer loans exist to protect borrowers from excessive charges.";

interface AskedCase {
  name: string;
  q: string;
  expect: boolean;
}

/** Does the citizen want a REASON, or the rule? */
const ASKED: AskedCase[] = [
  { name: "bare why", q: "why is there a late fee", expect: true },
  { name: "the follow-up that got a byte-identical answer", q: "but why though?", expect: true },
  { name: "how come", q: "how come the penalty applies after 30 days", expect: true },
  { name: "what is the reason for", q: "what is the reason for the late fee", expect: true },
  { name: "purpose phrasing", q: "what's the purpose of the family book", expect: true },
  { name: "rationale behind", q: "what is the rationale behind this requirement", expect: true },
  { name: "what is it for", q: "what is it for", expect: true },
  { name: "Khmer — the exact question that was over-refused", q: "ហេតុអ្វីបានជាមានការពិន័យយឺតយ៉ាវ", expect: true },
  { name: "Khmer — មូលហេតុ", q: "មូលហេតុអ្វីបានជាត្រូវបង់ថ្លៃ", expect: true },
  { name: "romanised Khmer why", q: "het avei trauv bang thlai penalty", expect: true },

  { name: "procedure question, not a why", q: "how do i renew my driving licence", expect: false },
  { name: "fee question is not a why", q: "what is the late fee", expect: false },
  { name: "document question is not a why", q: "what documents do i need", expect: false },
  { name: "location question is not a why", q: "where do i pay the penalty", expect: false },
];

interface ExplainsCase {
  name: string;
  text: string;
  expect: boolean;
}

/** Does the source give a reason, or state a rule? */
const EXPLAINS: ExplainsCase[] = [
  { name: "in order to", text: RULE_WITH_REASON, expect: true },
  { name: "to ensure", text: "Photographs are required to ensure the holder's identity can be confirmed.", expect: true },
  { name: "to prevent", text: "The declaration is checked to prevent duplicate registration.", expect: true },
  { name: "the purpose of", text: "The purpose of the inspection is road safety.", expect: true },
  { name: "intended to", text: "The deadline is intended to keep the register accurate.", expect: true },
  { name: "because", text: "The penalty applies because late registration burdens the register.", expect: true },

  { name: "the rule, stated without a reason — the MPWT-DL-008 case", text: RULE_WITHOUT_REASON, expect: false },
  { name: "procedural infinitive is not a purpose clause", text: "To exchange or renew a driving licence, bring the old licence and an identity card.", expect: false },
  { name: "'for verification purposes only' is not a rationale", text: "The copy is retained for verification purposes only.", expect: false },
  { name: "a deadline with no reason", text: "Registration must occur within 30 days of the birth.", expect: false },
];

interface GapCase {
  name: string;
  q: string;
  sources: string[];
  expect: boolean;
  why: string;
}

/** The gate itself: asked for a reason AND no source carries one. */
const GAPS: GapCase[] = [
  {
    name: "the original failure",
    q: "why is there a late fee",
    sources: [RULE_WITHOUT_REASON],
    expect: true,
    why: "source states the rule and no reason — say so, do not restate the rule",
  },
  {
    name: "the follow-up",
    q: "but why though?",
    sources: [RULE_WITHOUT_REASON],
    expect: true,
    why: "must not return the same answer a second time",
  },
  {
    name: "source does explain",
    q: "why is there a late fee",
    sources: [RULE_WITH_REASON],
    expect: false,
    why: "the reason is in the source — answer it normally",
  },
  {
    name: "not a why question",
    q: "what is the late fee",
    sources: [RULE_WITHOUT_REASON],
    expect: false,
    why: "the gate must not fire on a procedure question",
  },
  {
    name: "no sources at all",
    q: "why is there a late fee",
    sources: [],
    expect: true,
    why: "nothing can carry a reason, so the gap is real",
  },
  {
    name: "Khmer why against an English rule",
    q: "ហេតុអ្វីបានជាមានការពិន័យយឺតយ៉ាវ",
    sources: [RULE_WITHOUT_REASON],
    expect: true,
    why: "FR-08 — the gate is language-independent on the question side",
  },
  {
    name: "STRAY purpose clause from an unrelated chunk",
    q: "why is there a late fee",
    sources: [RULE_WITHOUT_REASON, UNRELATED_WITH_REASON],
    expect: false,
    why:
      "documents the trap rather than endorsing it: passing the whole candidate " +
      "set defeats the gate, because any purpose clause anywhere satisfies it. " +
      "lib/engine/tiers.ts must keep passing ONLY the top source — see the call " +
      "site at the rationaleGap() invocation.",
  },
];

let failures = 0;

console.log("\nRationale gate");
console.log("=".repeat(72));

console.log("\nseeksRationale — did the citizen ask for a reason?");
for (const c of ASKED) {
  const got = seeksRationale(c.q);
  const ok = got === c.expect;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${c.expect ? "asks why " : "does not"}  ${c.name}`,
  );
  if (!ok) console.log(`        "${c.q}" → ${got}, expected ${c.expect}`);
}

console.log("\nexplainsRationale — does the source give a reason?");
for (const c of EXPLAINS) {
  const got = explainsRationale(c.text);
  const ok = got === c.expect;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${c.expect ? "explains" : "rule only"}  ${c.name}`,
  );
  if (!ok) console.log(`        → ${got}, expected ${c.expect}`);
}

console.log("\nrationaleGap — the gate");
for (const c of GAPS) {
  const got = rationaleGap(c.q, c.sources);
  const ok = got === c.expect;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${c.expect ? "gap     " : "no gap  "}  ${c.name}`,
  );
  console.log(`        ${c.why}`);
  if (!ok) console.log(`        → ${got}, expected ${c.expect}`);
}

const total = ASKED.length + EXPLAINS.length + GAPS.length;

console.log(`\n${"=".repeat(72)}`);
console.log(
  failures === 0
    ? `All ${total} cases behaved as specified.\n`
    : `${failures} of ${total} cases did NOT behave as specified.\n`,
);

if (failures > 0) process.exitCode = 1;
