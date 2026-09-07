import { describe, it, expect } from "vitest";
import { verify } from "@/lib/engine/verify";

/**
 * FR-15 / NFR-01. This gate is the control that makes M-02 (zero uncited
 * factual claims) enforceable, and the primary mitigation for R-02.
 *
 * Two failure directions matter and they are not symmetric:
 *   - a claim that slips through reaches a citizen as an invented fee
 *   - a correct answer suppressed makes the gate look broken, and a gate that
 *     blocks good answers gets switched off (module docstring)
 */

const source = (id: string, text: string) => ({ id, text });

describe("verify — citation validity", () => {
  it("passes when every cited id was retrieved", () => {
    const result = verify(
      "The fee is 30,000 riel.",
      ["MPWT-DL-001"],
      [source("MPWT-DL-001", "The renewal fee is 30,000 riel.")],
      ["MPWT-DL-001", "MPWT-DL-002"],
    );
    expect(result.passed).toBe(true);
    expect(result.invalidCitations).toEqual([]);
  });

  it("hard-fails on a citation that was never retrieved — the model invented a source", () => {
    const result = verify(
      "The fee is 30,000 riel.",
      ["MPWT-DL-999"],
      [source("MPWT-DL-999", "The renewal fee is 30,000 riel.")],
      ["MPWT-DL-001"],
    );
    expect(result.passed).toBe(false);
    expect(result.invalidCitations).toEqual(["MPWT-DL-999"]);
  });

  it("reports every invalid citation, not just the first", () => {
    const result = verify(
      "Some answer.",
      ["A-B-001", "A-B-002"],
      [],
      ["A-B-003"],
    );
    expect(result.invalidCitations).toEqual(["A-B-001", "A-B-002"]);
  });
});

describe("verify — numeric claims (R-06)", () => {
  it("passes a fee that appears in the cited source", () => {
    const result = verify(
      "The fee is 30,000 riel.",
      ["X-1"],
      [source("X-1", "A fee of 30,000 riel applies on renewal.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
    expect(result.unsupported).toEqual([]);
  });

  it("catches an invented fee — the exact harm R-06 describes", () => {
    const result = verify(
      "The fee is 45,000 riel.",
      ["X-1"],
      [source("X-1", "A fee of 30,000 riel applies on renewal.")],
      ["X-1"],
    );
    expect(result.passed).toBe(false);
    expect(result.unsupported).toContain("45000");
  });

  it("matches a fee written with separators against a source written without", () => {
    const result = verify(
      "The fee is 30,000 riel.",
      ["X-1"],
      [source("X-1", "A fee of 30000 riel applies.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });

  it("checks numbers against the CITED sources only, not everything retrieved", () => {
    const result = verify(
      "The penalty is 2,000 riel per day.",
      ["X-1"],
      [source("X-1", "A fee of 30,000 riel applies on renewal.")],
      ["X-1", "X-2"],
    );
    expect(result.passed).toBe(false);
    expect(result.unsupported).toContain("2000");
  });

  it("accepts Khmer digits in the answer against ASCII digits in the source", () => {
    const result = verify(
      "ការពិន័យគឺ ៣០ ថ្ងៃ។",
      ["X-1"],
      [source("X-1", "A licence expired for more than 30 days attracts a penalty.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });

  it("collects multiple unsupported numbers", () => {
    const result = verify(
      "It costs 45,000 riel and takes 14 days.",
      ["X-1"],
      [source("X-1", "A fee of 30,000 riel applies.")],
      ["X-1"],
    );
    expect(result.unsupported).toEqual(expect.arrayContaining(["45000", "14"]));
  });
});

describe("verify — formatting artefacts are not claims", () => {
  it("ignores ordered-list markers", () => {
    const answer = "1. Old driving licence\n2. National identity card\n3. Photographs";
    const result = verify(
      answer,
      ["X-1"],
      [source("X-1", "Bring the old driving licence, national identity card and photographs.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });

  it("ignores chunk ids mentioned in the answer body", () => {
    const result = verify(
      "According to MPWT-DL-001 the fee is 30,000 riel.",
      ["MPWT-DL-001"],
      [source("MPWT-DL-001", "A fee of 30,000 riel applies.")],
      ["MPWT-DL-001"],
    );
    expect(result.passed).toBe(true);
  });

  it("ignores emergency numbers, which come from the facility directory", () => {
    const result = verify(
      "Contact emergency services: Police 117 · Ambulance 119 · Fire 118",
      [],
      [],
      [],
    );
    expect(result.passed).toBe(true);
  });
});

describe("verify — spelled-out quantities", () => {
  it("accepts 'thirty days' when the source says '30 days'", () => {
    const result = verify(
      "You must register within thirty days.",
      ["X-1"],
      [source("X-1", "Registration must occur within 30 days of the event.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });

  it("accepts '30 days' when the source says 'thirty days' — the reverse direction", () => {
    const result = verify(
      "You must register within 30 days.",
      ["X-1"],
      [source("X-1", "Registration must occur within thirty days of the event.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });

  it("catches a spelled-out quantity absent from the source in either form", () => {
    const result = verify(
      "You must bring three photographs.",
      ["X-1"],
      [source("X-1", "Bring photographs with a white background.")],
      ["X-1"],
    );
    expect(result.passed).toBe(false);
    expect(result.unsupported).toContain("three");
  });

  it("does not treat a number word as a claim unless it quantifies something procedural", () => {
    // "one" here is a pronoun, not a count of days/copies/riel.
    const result = verify(
      "You may apply at any one of the listed offices.",
      ["X-1"],
      [source("X-1", "Applications are accepted at listed service locations.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });

  it("handles Khmer number words against digits", () => {
    const result = verify(
      "ត្រូវចុះបញ្ជីក្នុងរយៈពេល សាមសិប ថ្ងៃ។",
      ["X-1"],
      [source("X-1", "Registration must occur within 30 days.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });
});

describe("verify — edge cases", () => {
  it("passes an answer with no claims at all", () => {
    const result = verify("Contact the responsible office.", [], [], []);
    expect(result.passed).toBe(true);
    expect(result.unsupported).toEqual([]);
  });

  it("fails a numeric claim when there are no cited sources to support it", () => {
    const result = verify("The fee is 30,000 riel.", [], [], []);
    expect(result.passed).toBe(false);
    expect(result.unsupported).toContain("30000");
  });

  it("deduplicates a number repeated in the answer", () => {
    const result = verify(
      "It costs 45,000 riel. Yes, 45,000 riel.",
      ["X-1"],
      [source("X-1", "A fee applies.")],
      ["X-1"],
    );
    expect(result.unsupported.filter((c) => c === "45000")).toHaveLength(1);
  });

  it("does not judge whether the answer is a GOOD answer — only whether specifics are supported", () => {
    // Entirely unhelpful, but every number in it is in the source.
    const result = verify(
      "30,000 riel.",
      ["X-1"],
      [source("X-1", "The renewal fee is 30,000 riel.")],
      ["X-1"],
    );
    expect(result.passed).toBe(true);
  });
});
