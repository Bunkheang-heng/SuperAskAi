/**
 * Verification gate check (FR-15).
 *
 * The gate is the control that turns "the model was told not to invent figures"
 * into "an invented figure cannot reach a citizen". A prompt rule is a request;
 * this is enforcement. So it needs its own evidence, separate from retrieval
 * metrics, and it needs to be run whenever the extractors change.
 *
 * Run: npx tsx scripts/verify-check.ts
 */

import { verify } from "../lib/engine/verify";

const SOURCE = {
  id: "MOI-CR-001",
  text: "Registration of a birth is made at the commune or sangkat administration of the place where the birth occurred, within thirty days of the birth. The declarant submits the hospital birth notification, the family book, and the identity documents of both parents.",
};

const RETRIEVED = ["MOI-CR-001", "MOI-CR-002"];

interface Case {
  name: string;
  answer: string;
  citations: string[];
  expectPass: boolean;
}

const CASES: Case[] = [
  {
    name: "faithful paraphrase, spelled-out number matching source",
    answer:
      "Register the birth at the commune administration where the birth happened, within thirty days. Bring the hospital birth notification, the family book, and both parents' identity documents.",
    citations: ["MOI-CR-001"],
    expectPass: true,
  },
  {
    name: "digit form of a number the source spells out",
    answer: "You must register the birth within 30 days at the commune.",
    citations: ["MOI-CR-001"],
    expectPass: true,
  },
  {
    name: "INVENTED deadline (source says thirty, answer says sixty)",
    answer: "You must register the birth within 60 days at the commune.",
    citations: ["MOI-CR-001"],
    expectPass: false,
  },
  {
    name: "INVENTED fee — the R-06 harm case",
    answer:
      "Register the birth at the commune within thirty days. The fee is 15000 riel.",
    citations: ["MOI-CR-001"],
    expectPass: false,
  },
  {
    name: "INVENTED document count",
    answer:
      "Bring the hospital birth notification and four photographs to the commune.",
    citations: ["MOI-CR-001"],
    expectPass: false,
  },
  {
    name: "FABRICATED citation id that was never retrieved",
    answer: "Register the birth at the commune within thirty days.",
    citations: ["MOI-CR-099"],
    expectPass: false,
  },
  {
    name: "ordered list markers are formatting, not claims",
    answer:
      "Do this:\n1. Go to the commune administration.\n2. Bring the family book.\n3. Register within thirty days.",
    citations: ["MOI-CR-001"],
    expectPass: true,
  },
  {
    name: "chunk id mentioned in prose is not a numeric claim",
    answer:
      "According to MOI-CR-001, register at the commune within thirty days.",
    citations: ["MOI-CR-001"],
    expectPass: true,
  },
];

let failures = 0;

console.log("\nVerification gate (FR-15)");
console.log("=".repeat(72));

for (const c of CASES) {
  const cited = c.citations.includes(SOURCE.id) ? [SOURCE] : [];
  const result = verify(c.answer, c.citations, cited, RETRIEVED);
  const ok = result.passed === c.expectPass;
  if (!ok) failures += 1;

  console.log(
    `${ok ? "ok  " : "FAIL"}  ${c.expectPass ? "should pass" : "should block"}  ${c.name}`,
  );

  if (!result.passed) {
    const detail = [
      ...result.unsupported.map((u) => `unsupported:${u}`),
      ...result.invalidCitations.map((i) => `invalid-citation:${i}`),
    ];
    console.log(`        blocked on → ${detail.join(", ")}`);
  }
}

console.log("=".repeat(72));
console.log(
  failures === 0
    ? `All ${CASES.length} cases behaved as specified.\n`
    : `${failures} of ${CASES.length} cases did NOT behave as specified.\n`,
);

if (failures > 0) process.exitCode = 1;
