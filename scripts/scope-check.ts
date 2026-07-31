/**
 * Routing checks for the four ways a question can end (sections 6.1, 6.2, 12).
 *
 * When AskGov does not produce a retrieved answer, there are three different
 * reasons, and answering all three with the same words is what makes a
 * correctly-behaving service feel stupid:
 *
 *   glossary      a definition question. In scope (section 6.1) — ANSWERED
 *   off-domain    not a service question at all. Refused, no escalation:
 *                 sending someone to an officer because they asked for a
 *                 translation wastes the officer's time and theirs
 *   coverage gap  a service question from a ministry not yet onboarded.
 *                 Refused WITH escalation — an officer can genuinely help
 *
 * The fourth ending is the ordinary one: retrieval answers it.
 *
 * The precision cases at the bottom are the point of the file. The glossary
 * runs after the FR-16 confidence gate precisely so a term appearing inside a
 * procedure question cannot steal it — "article", "province" and "prakas" are
 * ordinary words in questions that are not asking for a definition.
 *
 * Run: npx tsx scripts/scope-check.ts
 */

/**
 * This harness classifies routing by reading `diagnostics.refusalReason`, which
 * only exists when diagnostics are enabled. Diagnostics are opt-in (FR-72/73:
 * the trace is for DGC and ministry users, so the citizen default must be off),
 * therefore the check turns them on for itself.
 *
 * This works because ask() reads process.env at call time, not at module load
 * — ES imports are hoisted, so this assignment does NOT run before the import
 * below, and relying on ordering here would be a trap for whoever edits next.
 */
process.env.DIAGNOSTICS_ENABLED = "true";

import { ask } from "../lib/engine/tiers";
import { detectLang } from "../lib/lang/detect";

type Route = "glossary" | "off-domain" | "coverage-gap" | "answered";

interface Case {
  q: string;
  route: Route;
  /** Expected glossary entry, for route "glossary". */
  term?: string;
  /** Expected FR-08 language, where the case is a detection regression. */
  lang?: "en" | "km";
  why: string;
}

const CASES: Case[] = [
  // ── Definition questions are IN scope and must be answered ───────────────
  // The off-domain refusal copy names "What does prakas mean?" as an example of
  // something AskGov can do. Before the glossary existed it then refused that
  // exact question and offered to escalate it.
  {
    q: "what does prakas mean",
    route: "glossary",
    term: "GLO-001",
    lang: "en",
    why: "the example the refusal copy itself advertises",
  },
  {
    q: "what does prakas mean?",
    route: "glossary",
    term: "GLO-001",
    why: "same, with punctuation",
  },
  {
    q: "what is a prakas",
    route: "glossary",
    term: "GLO-001",
    why: "the other natural phrasing",
  },
  {
    q: "តើ ប្រកាស មានន័យដូចម្តេច?",
    route: "glossary",
    term: "GLO-001",
    lang: "km",
    why: "Khmer definitional intent (FR-08)",
  },
  {
    q: "what is a joint prakas",
    route: "glossary",
    term: "GLO-002",
    why: "longest term wins — joint prakas over prakas",
  },
  {
    q: "what does sub-decree mean",
    route: "glossary",
    term: "GLO-003",
    why: "hyphenated term",
  },
  {
    q: "what does ANK-BK stand for",
    route: "glossary",
    term: "GLO-003",
    why: "the registry abbreviation a citizen sees in a citation",
  },
  {
    q: "what does MPWT mean",
    route: "glossary",
    term: "GLO-013",
    why: "ministry abbreviation from the citation block",
  },
  {
    q: "what does review due mean",
    route: "glossary",
    term: "GLO-014",
    why: "AskGov's own freshness label (FR-64)",
  },
  {
    q: "what is the difference between a sangkat and a khum",
    route: "glossary",
    term: "GLO-011",
    why: "comparison is a definitional intent",
  },

  // ── Not a service question: refuse, do NOT escalate ──────────────────────
  {
    q: "how do you say hello in khmer",
    route: "off-domain",
    why: "translation request",
  },
  { q: "translate this to english", route: "off-domain", why: "explicit translation" },
  { q: "what is the capital of france", route: "off-domain", why: "general knowledge" },
  { q: "what is the weather today", route: "off-domain", why: "not a service at all" },

  // ── Coverage gap: refuse AND escalate, an officer can help ───────────────
  {
    q: "how do i apply for a fishing permit",
    route: "coverage-gap",
    why: "real service question, ministry not onboarded",
  },
  {
    q: "how do i enrol my child in school",
    route: "coverage-gap",
    why: "same — must offer the officer, unlike off-domain",
  },
  // NOT asserted here, because it does not currently hold: "how do i register a
  // new company" and "how do i get a passport" score ABOVE the retrieval floor
  // on the shared verb and are answered from birth-registration and family-book
  // sources respectively. That is a retrieval precision defect, not a routing
  // one, and re-deriving RETRIEVAL_MIN_SCORE is a governance decision rather
  // than a test fix. See "Known gaps" in the README. Do not add them as
  // coverage-gap cases until the gate can tell them apart.

  // ── Precision: retrieval must keep the questions it can answer ───────────
  {
    q: "how do i renew my driving licence",
    route: "answered",
    why: "ordinary procedure question",
  },
  {
    q: "what documents do i need for a birth certificate",
    route: "answered",
    why: '"what documents" is not a definition request',
  },
  {
    q: "what is the fee for renewing a driving licence",
    route: "answered",
    why: '"what is" plus a fee is a procedure question, not a definition',
  },
];

function routeOf(res: Awaited<ReturnType<typeof ask>>): Route {
  const reason = res.diagnostics?.refusalReason;
  if (res.diagnostics?.provider === "glossary") return "glossary";
  if (reason === "scope:not_a_service_question") return "off-domain";
  if (reason?.startsWith("retrieval:")) return "coverage-gap";
  return "answered";
}

async function main() {
  let failures = 0;

  console.log("\nScope routing: definition · off-domain · coverage gap · answered");
  console.log("=".repeat(72));

  for (const c of CASES) {
    const res = await ask({ question: c.q });
    const route = routeOf(res);
    const problems: string[] = [];

    if (route !== c.route) problems.push(`route ${route}, expected ${c.route}`);

    // Escalation is the operational difference between the two refusals: an
    // officer can help with a coverage gap and cannot help with the weather.
    const wantEscalate = c.route === "coverage-gap";
    if (c.route !== "answered" && res.escalate !== wantEscalate) {
      problems.push(
        `escalate ${res.escalate}, expected ${wantEscalate}`,
      );
    }

    if (c.term) {
      const got = res.diagnostics?.model ?? "";
      if (!got.startsWith(c.term)) {
        problems.push(`term ${got || "none"}, expected ${c.term}`);
      }
    }

    if (c.lang) {
      const got = detectLang(c.q);
      if (got !== c.lang) problems.push(`lang ${got}, expected ${c.lang}`);
    }

    // A definition asserts nothing about a specific service, so it must not
    // arrive carrying a citation — a fabricated instrument number and article
    // is the FR-45 failure this build exists to avoid.
    if (c.route === "glossary" && res.citations.length > 0) {
      problems.push(`${res.citations.length} citations on a definition`);
    }

    const ok = problems.length === 0;
    if (!ok) failures += 1;

    console.log(`${ok ? "ok  " : "FAIL"} ${route.padEnd(13)} ${c.why}`);
    console.log(`       "${c.q}"`);
    for (const p of problems) console.log(`       → ${p}`);
  }

  console.log("=".repeat(72));
  console.log(
    failures === 0
      ? `All ${CASES.length} cases routed as specified.\n`
      : `${failures} of ${CASES.length} cases did NOT route as specified.\n`,
  );

  if (failures > 0) process.exitCode = 1;
}

main();
