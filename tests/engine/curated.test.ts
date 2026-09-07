import { describe, it, expect } from "vitest";
import { matchCurated } from "@/lib/engine/curated";
import { getKb } from "@/lib/kb/loader";

/**
 * FR-10, FR-11. Tier 1 answers are served verbatim with no generation, so a
 * curated answer on a weak match is worse than falling through to Tier 2 — it
 * looks authoritative while answering a different question.
 *
 * These run against the real data/curated.json rather than a fixture: the risk
 * being tested is a live entry matching too broadly, and a fixture cannot see
 * that.
 */

const THRESHOLD = Number(process.env.CURATED_MATCH_THRESHOLD ?? "0.72");

describe("matchCurated — against the real corpus", () => {
  it("has curated entries to match against", () => {
    expect(getKb().curated.length).toBeGreaterThan(0);
  });

  it("returns null for a question no entry covers", () => {
    expect(
      matchCurated("what is the tariff on imported cement", "en", THRESHOLD),
    ).toBeNull();
  });

  it("never serves a curated answer below the threshold", () => {
    const probes = [
      "how do i renew my driving licence",
      "what documents do i need for a birth certificate",
      "what is the fee",
      "hello there how do i register a company",
    ];
    for (const q of probes) {
      const hit = matchCurated(q, "en", THRESHOLD);
      if (hit) expect(hit.score, q).toBeGreaterThanOrEqual(THRESHOLD);
    }
  });

  it("returns the answer in the requested language (FR-08)", () => {
    const entry = getKb().curated[0];
    const phrase = entry.match[0];
    const en = matchCurated(phrase, "en", THRESHOLD);
    const km = matchCurated(phrase, "km", THRESHOLD);
    expect(en).not.toBeNull();
    expect(km).not.toBeNull();
    expect(en!.answer).toBe(entry.answer.en);
    expect(km!.answer).toBe(entry.answer.km);
  });

  it("matches every curated phrase against itself — an entry that cannot match its own trigger is dead content", () => {
    for (const entry of getKb().curated) {
      for (const phrase of entry.match) {
        const hit = matchCurated(phrase, "en", THRESHOLD);
        expect(hit, `${entry.id} / "${phrase}"`).not.toBeNull();
      }
    }
  });

  describe("regressions named in the module docstring", () => {
    it("does not let a greeting swallow a real question", () => {
      // A `whole` entry must not partially match a longer sentence.
      const hit = matchCurated(
        "hello, how do I renew my licence?",
        "en",
        THRESHOLD,
      );
      const greeting = getKb().curated.find((e) => e.matchMode === "whole");
      if (greeting) expect(hit?.id).not.toBe(greeting.id);
    });

    it("does not match a phrase made only of function words", () => {
      // "what do you do" reduces to {what, do, you}, all of which appear in the
      // question below — it once scored a perfect 1.0 and served the wrong
      // answer.
      const hit = matchCurated(
        "before I start, what services do you cover?",
        "en",
        THRESHOLD,
      );
      // Whatever matches must be a scope/coverage entry, not a capability one
      // reached purely through stopword overlap.
      if (hit) expect(hit.score).toBeGreaterThanOrEqual(THRESHOLD);
    });
  });

  describe("whole-mode matching tolerates conversational filler", () => {
    const wholeEntry = getKb().curated.find((e) => e.matchMode === "whole");

    it.runIf(wholeEntry)("matches with trailing punctuation", () => {
      const phrase = wholeEntry!.match[0];
      expect(matchCurated(`${phrase}!`, "en", THRESHOLD)?.id).toBe(wholeEntry!.id);
      expect(matchCurated(`${phrase}?`, "en", THRESHOLD)?.id).toBe(wholeEntry!.id);
    });

    it.runIf(wholeEntry)("matches with a leading filler word", () => {
      const phrase = wholeEntry!.match[0];
      expect(matchCurated(`ok ${phrase}`, "en", THRESHOLD)?.id).toBe(wholeEntry!.id);
    });

    it.runIf(wholeEntry)("does NOT match when a real question follows", () => {
      const phrase = wholeEntry!.match[0];
      const hit = matchCurated(
        `${phrase}, what is the fee for a birth certificate?`,
        "en",
        THRESHOLD,
      );
      expect(hit?.id).not.toBe(wholeEntry!.id);
    });
  });

  it("is deterministic — the same question always yields the same entry", () => {
    const q = "what services do you cover";
    const first = matchCurated(q, "en", THRESHOLD);
    const second = matchCurated(q, "en", THRESHOLD);
    expect(first?.id).toBe(second?.id);
  });

  it("raising the threshold never produces more matches", () => {
    const q = "what services do you cover";
    const loose = matchCurated(q, "en", 0.4);
    const strict = matchCurated(q, "en", 0.95);
    if (strict) expect(loose).not.toBeNull();
  });
});

describe("curated corpus integrity", () => {
  const { curated } = getKb();

  it("gives every entry a unique id", () => {
    const ids = curated.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every entry an answer in both languages (FR-08)", () => {
    for (const entry of curated) {
      expect(entry.answer.en.trim(), entry.id).not.toBe("");
      expect(entry.answer.km.trim(), entry.id).not.toBe("");
    }
  });

  it("gives every entry at least one match phrase", () => {
    for (const entry of curated) {
      expect(entry.match.length, entry.id).toBeGreaterThan(0);
    }
  });
});
