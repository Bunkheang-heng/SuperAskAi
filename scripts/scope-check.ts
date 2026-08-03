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
 *   coverage gap  a service question from a ministry not yet onboarded. The
 *                 officer is ALWAYS offered and there are never citations.
 *                 Whether the citizen also receives an unverified model answer
 *                 depends on GENERAL_FALLBACK_ENABLED, so this route covers
 *                 both refusal and unverified-answer, and the flag decides
 *                 which — see the `unverified` column in the output.
 *   entity lookup a question about a NAMED business or record rather than the
 *                 rule (section 6.2). Refused WITH escalation, and answered
 *                 with the addresses of the public registers.
 *
 * The fifth ending is the ordinary one: retrieval answers it, with citations.
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

type Route =
  | "glossary"
  | "off-domain"
  | "coverage-gap"
  | "entity-lookup"
  | "answered";

interface Case {
  q: string;
  route: Route;
  /** Expected glossary entry, for route "glossary". */
  term?: string;
  /** Expected FR-08 language, where the case is a detection regression. */
  lang?: "en" | "km";
  /** Prior turns, for follow-up resolution cases (FR-07). */
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  /** Substrings the answer must NOT contain — topic-drift regressions. */
  absent?: string[];
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

  // ── Section 6.2: records, not rules ──────────────────────────────────────
  {
    q: "Is the trademark 'Baby Outlet' registered in Cambodia?",
    route: "entity-lookup",
    why: "a named mark is a register lookup; the name is usually quoted",
  },

  // ── FR-08 language routing ───────────────────────────────────────────────
  // The reply follows the script the citizen typed in. Romanised Khmer is
  // Latin script, so it is answered in English even though FR-03 still
  // romanises the QUERY to Khmer for retrieval.
  {
    q: "sombot kamnaot trauv ke ekasa avei khlah",
    route: "coverage-gap",
    lang: "en",
    why: "romanised Khmer is answered in English, not Khmer script",
  },
  {
    q: "ត្រូវការឯកសារអ្វីខ្លះសម្រាប់សំបុត្រកំណើត?",
    route: "answered",
    lang: "km",
    why: "Khmer script is answered in Khmer",
  },

  // ── FR-07 follow-up resolution, and the drift it used to cause ───────────
  // "where in phnom penh?" names nothing, and neither does the turn before it.
  // Resolving against only the previous turn lost the subject entirely and the
  // query then matched the office-and-hours passages of whatever the corpus
  // holds — a passport question answered with driving-licence locations.
  {
    q: "where in phnom penh?",
    route: "coverage-gap",
    history: [
      {
        role: "user",
        text: "i dont have a passport, what do i need to bring to make my passport and where can i get it made?",
      },
      {
        role: "assistant",
        text: "You can apply at the General Department of Immigration in Phnom Penh.",
      },
      { role: "user", text: "can you give me the specific locations?" },
      {
        role: "assistant",
        text: "The main office is on Russian Federation Boulevard.",
      },
    ],
    absent: ["driving licence", "vehicle registration"],
    why: "a subject-less follow-up must keep the subject from earlier turns",
  },
  {
    q: "and the fee?",
    route: "answered",
    history: [
      { role: "user", text: "How do I renew my Cambodian driving licence?" },
      {
        role: "assistant",
        text: "Bring your old licence, national ID card and three photographs.",
      },
    ],
    why: "an ordinary follow-up still resolves against the previous turn",
  },
];

function routeOf(res: Awaited<ReturnType<typeof ask>>): Route {
  const reason = res.diagnostics?.refusalReason;
  if (res.diagnostics?.provider === "glossary") return "glossary";
  if (reason === "scope:not_a_service_question") return "off-domain";
  if (reason === "scope:entity_record_lookup") return "entity-lookup";
  if (reason?.startsWith("retrieval:")) return "coverage-gap";
  // An unsourced answer IS the coverage-gap ending, just with the fallback on:
  // no approved source, no citations, officer offered. Classifying it as
  // "answered" would let a genuine leak — an off-domain question picked up by
  // the fallback — pass as an ordinary answer, which is how it escaped once.
  if (reason === "fallback:general_knowledge") return "coverage-gap";
  return "answered";
}

async function main() {
  let failures = 0;

  console.log("\nScope routing: definition · off-domain · coverage gap · answered");
  console.log("=".repeat(72));

  for (const c of CASES) {
    const res = await ask({ question: c.q, history: c.history });
    const route = routeOf(res);
    const problems: string[] = [];

    if (route !== c.route) problems.push(`route ${route}, expected ${c.route}`);

    // Escalation is the operational difference between the refusals: an officer
    // can help with a coverage gap or a register lookup, and cannot help with
    // the weather.
    const wantEscalate =
      c.route === "coverage-gap" || c.route === "entity-lookup";
    if (c.route !== "answered" && res.escalate !== wantEscalate) {
      problems.push(
        `escalate ${res.escalate}, expected ${wantEscalate}`,
      );
    }

    // An unsourced answer must never carry a citation — one would be a
    // fabricated government reference.
    if (c.route === "coverage-gap" && res.citations.length > 0) {
      problems.push(`${res.citations.length} citations on a coverage gap`);
    }

    // Conversely, an ordinary answer must actually rest on a source. Without
    // this, the unverified fallback quietly taking over an in-corpus question
    // would still read as a pass.
    if (c.route === "answered") {
      if (res.citations.length === 0) problems.push("answered with no citation");
      if (res.unverified) problems.push("answered but marked unverified");
    }

    // Topic drift: the answer resolved against the wrong subject.
    for (const term of c.absent ?? []) {
      if (res.answer.toLowerCase().includes(term.toLowerCase())) {
        problems.push(`answer mentions "${term}"`);
      }
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
