/**
 * Tier 1 curated matcher checks (FR-10, FR-11).
 *
 * Two failure modes this guards, both of which shipped at least once:
 *
 * 1. Conversational input falling through to a refusal. A citizen who opens with
 *    "hello" — which is how most people open a chat — got "no approved source
 *    covers this" as their first experience of the service. A greeting is not a
 *    factual question, so answering it cites nothing and risks nothing; refusing
 *    it just makes a correctly-behaving system feel broken.
 *
 * 2. Substring matching serving the wrong curated answer. The phrase "hi"
 *    matched "w-hi-ch office holds my file", replacing a wayfinding answer with a
 *    greeting. Whole-word matching for Latin, and `matchMode: "whole"` for
 *    greetings so they cannot swallow a real question that merely opens politely.
 *
 * Run: npx tsx scripts/curated-check.ts
 */

import { matchCurated } from "../lib/engine/curated";

const THRESHOLD = Number(process.env.CURATED_MATCH_THRESHOLD ?? "0.72");

interface Case {
  q: string;
  /** Expected curated id, or null for "must not match any curated answer". */
  expect: string | null;
  why: string;
}

const CASES: Case[] = [
  // Greetings and conversational openers must be served, not refused.
  { q: "hello", expect: "CUR-010", why: "bare greeting" },
  { q: "hi", expect: "CUR-010", why: "shortest greeting" },
  { q: "Hi there!", expect: "CUR-010", why: "greeting with filler and punctuation" },
  { q: "good morning", expect: "CUR-010", why: "time-of-day greeting" },
  { q: "ជំរាបសួរ", expect: "CUR-010", why: "Khmer greeting" },
  { q: "សួស្តី", expect: "CUR-010", why: "Khmer informal greeting" },
  { q: "thanks", expect: "CUR-011", why: "closing courtesy" },
  { q: "អរគុណ", expect: "CUR-011", why: "Khmer thanks" },
  { q: "bye", expect: "CUR-012", why: "farewell" },

  // Capability questions are phrase-matched and may sit inside a sentence.
  { q: "what can you do", expect: "CUR-001", why: "capability question" },
  {
    q: "before I start, what services do you cover exactly?",
    expect: "CUR-002",
    why: "phrase match inside a longer sentence",
  },

  // A greeting must NEVER win against a real question.
  {
    q: "hello, how do I renew my driving licence?",
    expect: null,
    why: "greeting prefix must not swallow the real question",
  },
  {
    q: "hi, what documents do I need for a birth certificate?",
    expect: null,
    why: "same, with the shortest greeting",
  },

  // The substring bug: "hi" inside other words.
  {
    q: "which office holds my file for a birth certificate?",
    expect: null,
    why: '"hi" inside "which" must not match',
  },
  {
    q: "this is a high priority question about licences",
    expect: null,
    why: '"hi" inside "this" and "high" must not match',
  },
  {
    q: "what is the fee, and which office do I pay it at?",
    expect: null,
    why: "wayfinding question must reach retrieval",
  },
];

let failures = 0;

console.log("\nTier 1 curated matcher");
console.log("=".repeat(72));

for (const c of CASES) {
  const hit = matchCurated(c.q, "en", THRESHOLD);
  const got = hit?.id ?? null;
  const ok = got === c.expect;
  if (!ok) failures += 1;

  console.log(
    `${ok ? "ok  " : "FAIL"} ${String(got ?? "no match").padEnd(11)} ${c.why}`,
  );
  console.log(`       "${c.q}"`);
  if (!ok) console.log(`       expected ${c.expect ?? "no match"}`);
}

console.log("=".repeat(72));
console.log(
  failures === 0
    ? `All ${CASES.length} cases behaved as specified.\n`
    : `${failures} of ${CASES.length} cases did NOT behave as specified.\n`,
);

if (failures > 0) process.exitCode = 1;
