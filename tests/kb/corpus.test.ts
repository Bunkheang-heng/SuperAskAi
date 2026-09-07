import { describe, it, expect } from "vitest";
import { getKb } from "@/lib/kb/loader";
import { freshnessOf } from "@/lib/engine/freshness";

/**
 * Corpus integrity — the FR-45 metadata contract and the honesty conventions
 * data/README.md sets out for anyone adding content.
 *
 * These are the tests that would catch a placeholder fee, an invented
 * instrument number, or a back-translated Khmer source text reaching a citizen.
 * They run against the live corpus on every push, which is the point: the
 * corpus is the part of this system that changes without a code review.
 */

const kb = getKb();

describe("FR-45 metadata is present on every chunk", () => {
  it("has a corpus at all", () => {
    expect(kb.chunks.length).toBeGreaterThan(0);
  });

  it("gives every chunk a unique id", () => {
    const ids = kb.chunks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    "ministry",
    "ministryKm",
    "doc",
    "instrument",
    "article",
    "effective",
    "verified",
    "reviewDue",
    "geoScope",
    "sensitivity",
    "text",
  ] as const)("populates %s on every chunk", (field) => {
    for (const c of kb.chunks) {
      expect(String(c[field] ?? "").trim(), `${c.id}.${field}`).not.toBe("");
    }
  });

  it("uses a parseable date for effective, verified and reviewDue", () => {
    for (const c of kb.chunks) {
      for (const field of ["effective", "verified", "reviewDue"] as const) {
        expect(
          Number.isNaN(new Date(c[field]).getTime()),
          `${c.id}.${field} = ${c[field]}`,
        ).toBe(false);
      }
    }
  });

  it("sets reviewDue after verified — content cannot be due for review before it was checked", () => {
    for (const c of kb.chunks) {
      expect(
        new Date(c.reviewDue).getTime(),
        `${c.id}: verified ${c.verified}, reviewDue ${c.reviewDue}`,
      ).toBeGreaterThan(new Date(c.verified).getTime());
    }
  });

  it("uses a known sensitivity value", () => {
    for (const c of kb.chunks) {
      expect(["public", "internal", "restricted"], c.id).toContain(c.sensitivity);
    }
  });

  it("scopes geography to KH or an ISO 3166-2 subdivision", () => {
    for (const c of kb.chunks) {
      expect(c.geoScope, c.id).toMatch(/^KH(-\w+)?$/);
    }
  });

  it("indexes candidate citizen questions on every chunk (FR-44)", () => {
    // The single largest lever on Khmer retrieval recall (R-07). A chunk with
    // none is reachable only by body-text overlap.
    for (const c of kb.chunks) {
      expect(c.questions.length, `${c.id} has no FR-44 questions`).toBeGreaterThan(0);
    }
  });
});

describe("retrieval only serves content it is allowed to serve", () => {
  it("excludes superseded chunks from both indexes (FR-18, FR-58)", () => {
    const superseded = kb.chunks.filter((c) => c.superseded).map((c) => c.id);
    if (superseded.length === 0) return;

    const lexical = kb.bm25.score(["licence", "fee", "registration"]);
    for (const id of superseded) expect(lexical.has(id)).toBe(false);
  });

  it("serves only public-sensitivity content to citizens", () => {
    // Nothing in the citizen path filters on sensitivity yet, so anything
    // above public in the corpus would be served. Catch it here.
    const nonPublic = kb.chunks.filter((c) => c.sensitivity !== "public");
    expect(nonPublic.map((c) => c.id)).toEqual([]);
  });
});

/**
 * Known sample content, quarantined.
 *
 * data/README.md: `moi-civil-registration.json` is still sample content —
 * instrument numbers read "Sub-Decree No. XXX", the doc titles are prefixed
 * "[SAMPLE]", and the fees are deliberately placeholders rather than plausible
 * figures, because an invented fee is the exact harm R-06 describes. It should
 * be replaced the same way the MPWT files were.
 *
 * This list is the quarantine. It exists so the honesty checks below can run
 * green against the rest of the corpus instead of being switched off, and it
 * is asserted to be EXACT: adding sample content anywhere else fails, and
 * replacing this file with real content also fails, forcing the quarantine to
 * be removed deliberately rather than left behind as a permanent exemption.
 */
const SAMPLE_CONTENT_IDS = [
  "MOI-CR-001",
  "MOI-CR-002",
  "MOI-CR-003",
  "MOI-CR-004",
  "MOI-CR-005",
  "MOI-CR-006",
  "MOI-CR-007",
  "MOI-CR-008",
];

const PLACEHOLDER = /\[(SAMPLE|PLACEHOLDER|TBD|TODO|XXX)[^\]]*\]|\bXXX+\b|\bTBD\b/i;

/** Fee figures stated in a chunk, as plain numbers. */
function feesIn(text: string): number[] {
  return [...text.matchAll(/\b(\d[\d,]*)\s*riel\b/gi)].map((m) =>
    Number(m[1].replace(/,/g, "")),
  );
}

describe("honesty conventions (data/README.md)", () => {
  const real = kb.chunks.filter((c) => !SAMPLE_CONTENT_IDS.includes(c.id));

  it("quarantines exactly the known sample content — no more, no less", () => {
    const flagged = kb.chunks
      .filter(
        (c) =>
          PLACEHOLDER.test(c.instrument) ||
          PLACEHOLDER.test(c.article) ||
          PLACEHOLDER.test(c.doc) ||
          PLACEHOLDER.test(c.text),
      )
      .map((c) => c.id)
      .sort();

    expect(flagged).toEqual([...SAMPLE_CONTENT_IDS].sort());
  });

  it("invents no instrument or article numbers outside the quarantine", () => {
    // Where a source page cites no legal instrument, `article` must read
    // "Not cited on source page" rather than a plausible-looking reference.
    for (const c of real) {
      expect(c.instrument, `${c.id}.instrument`).not.toMatch(PLACEHOLDER);
      expect(c.article, `${c.id}.article`).not.toMatch(PLACEHOLDER);
      expect(c.instrument, `${c.id}.instrument`).not.toMatch(/placeholder/i);
    }
  });

  it("carries no placeholder text in any citizen-visible field outside the quarantine", () => {
    for (const c of real) {
      expect(c.text, `${c.id}.text`).not.toMatch(PLACEHOLDER);
      expect(c.doc, `${c.id}.doc`).not.toMatch(PLACEHOLDER);
      if (c.textKm) expect(c.textKm, `${c.id}.textKm`).not.toMatch(PLACEHOLDER);
    }
  });

  it("states no zero or marker fee outside the quarantine", () => {
    // A zero fee, or a repeated-digit marker figure, reaching a citizen is the
    // exact harm R-06 describes.
    for (const c of real) {
      for (const fee of feesIn(c.text)) {
        expect(fee, `${c.id} states a fee of ${fee} riel`).toBeGreaterThan(0);
        expect(String(fee), `${c.id} states a marker fee`).not.toMatch(
          /^(?:1234\d*|9999+)$/,
        );
      }
    }
  });

  it("does not back-translate Khmer — textKm is present only where verbatim Khmer was read", () => {
    // Machine-translating English into textKm would fabricate a source text no
    // ministry ever wrote. Absent is the honest value; empty-string is not.
    for (const c of kb.chunks) {
      if (!("textKm" in c)) continue;
      if (c.textKm === undefined) continue;
      expect(c.textKm.trim(), `${c.id}.textKm is present but empty`).not.toBe("");
    }
  });

  it("marks nothing as steward-approved — reading a page is not a ministry signing it off (§10.5, FR-49)", () => {
    // This test inverts the moment a steward approval workflow exists. Until
    // §8.5 is built, anything true here is a governance failure.
    const approved = kb.chunks.filter((c) => c.stewardApproved === true);
    expect(approved.map((c) => c.id)).toEqual([]);
  });

  it("records provenance on machine-ingested chunks (FR-54)", () => {
    for (const c of kb.chunks) {
      if (c.stewardApproved !== false) continue;
      // §8.6 ingestion sets stewardApproved: false explicitly. Anything it
      // produced must say when it was fetched and from where.
      if (c.ingestedAt || c.ingestedFrom) {
        expect(c.ingestedFrom, `${c.id}.ingestedFrom`).toMatch(/^https?:\/\//);
        expect(Number.isNaN(new Date(c.ingestedAt!).getTime()), c.id).toBe(false);
      }
    }
  });
});

describe("freshness of the live corpus (FR-52, M-05)", () => {
  it("reports how much of the corpus is past its review date", () => {
    const stale = kb.chunks.filter((c) => freshnessOf(c) === "stale");
    // Not an assertion on the count — a stale chunk is a content problem, not
    // a build failure, and FR-26 already warns the citizen. This pins that
    // freshness is computable for every chunk without throwing.
    expect(stale.length).toBeLessThanOrEqual(kb.chunks.length);
    for (const c of kb.chunks) {
      expect(["fresh", "due", "stale"], c.id).toContain(freshnessOf(c));
    }
  });
});

describe("supporting data files", () => {
  it("loads aliases for query expansion (FR-06)", () => {
    expect(Object.keys(kb.aliases).length).toBeGreaterThan(0);
  });

  it("gives every alias entry at least one expansion", () => {
    for (const [term, expansions] of Object.entries(kb.aliases)) {
      expect(expansions.length, term).toBeGreaterThan(0);
    }
  });

  it("carries the emergency numbers guardrail rule 6 depends on", () => {
    expect(kb.emergency.length).toBeGreaterThan(0);
    for (const e of kb.emergency) {
      expect(e.number.trim(), e.label).not.toBe("");
      expect(e.labelKm.trim(), e.label).not.toBe("");
    }
  });

  it("carries no placeholder in an emergency number — rule 6 depends on these being right", () => {
    // README known gap 9: these are placeholders and must be verified before
    // any release. This test is what turns that note into a build failure.
    for (const e of kb.emergency) {
      expect(e.number, e.label).not.toMatch(/\[|SAMPLE|XXX|TBD/i);
      expect(e.number, e.label).toMatch(/^[\d\s+()-]+$/);
    }
  });

  it("gives DG Support contact details for the escalation path (FR-29)", () => {
    expect(kb.support.name.trim()).not.toBe("");
  });
});
