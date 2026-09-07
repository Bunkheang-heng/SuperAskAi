import { describe, it, expect } from "vitest";
import { contentTerms, isSubjectless, MIN_TERMS, STOPWORDS } from "@/lib/lang/content";
import { detectLang } from "@/lib/lang/detect";

/**
 * lib/retrieval and lib/engine/topicality must agree on "does this text say
 * anything specific?". They were separate once, and the disagreement was the
 * whole bug: a passport follow-up resolved against a subject-less turn AND
 * skipped the gate that would have caught the result.
 */

describe("contentTerms", () => {
  it("drops function words", () => {
    expect(contentTerms("what is the fee")).toEqual(["fee"]);
  });

  it("keeps the words that carry aboutness", () => {
    // Terms come back suffix-stripped: segment() stems Latin tokens so that
    // "driving" and "drive" compare equal. See lib/lang/stem.ts.
    const terms = contentTerms("how do i renew my driving licence");
    expect(terms).toEqual(expect.arrayContaining(["renew", "driv", "licenc"]));
  });

  it("drops bare numbers", () => {
    expect(contentTerms("30 days 2026")).toEqual(["day"]);
  });

  it("drops single characters", () => {
    expect(contentTerms("a b driving")).toEqual(["driv"]);
  });

  it("folds case", () => {
    expect(contentTerms("DRIVING Licence")).toEqual(["driv", "licenc"]);
  });

  it("drops deictic words that point at the previous turn rather than a service", () => {
    // These read as content words but make a subject-less follow-up look
    // substantive, which is exactly the bug.
    expect(contentTerms("can you give me the specific locations")).toEqual([]);
    expect(contentTerms("the exact details again")).toEqual([]);
  });

  it("segments Khmer", () => {
    expect(contentTerms("ប័ណ្ណបើកបរ").length).toBeGreaterThan(0);
  });

  it("returns an empty array for empty input", () => {
    expect(contentTerms("")).toEqual([]);
  });
});

describe("isSubjectless", () => {
  it.each([
    "where in phnom penh?",
    "and the fee?",
    "can you give me the specific locations?",
    "what about that one",
    "ok",
  ])("is true for a turn that names nothing: %s", (q) => {
    expect(isSubjectless(q)).toBe(true);
  });

  it.each([
    "how do i renew my driving licence",
    "what documents do i need for a birth certificate",
    "tom holland from spider man",
  ])("is false for a turn carrying its own subject: %s", (q) => {
    expect(isSubjectless(q)).toBe(false);
  });

  it("uses distinct terms, so repetition does not manufacture a subject", () => {
    expect(isSubjectless("licence licence licence")).toBe(true);
  });

  it("agrees with MIN_TERMS", () => {
    // Exactly MIN_TERMS distinct content words is the boundary: subject-full.
    const atFloor = "renew driving licence";
    expect(new Set(contentTerms(atFloor)).size).toBe(MIN_TERMS);
    expect(isSubjectless(atFloor)).toBe(false);
  });

  it("exports a non-empty stopword set", () => {
    expect(STOPWORDS.size).toBeGreaterThan(0);
    expect(STOPWORDS.has("the")).toBe(true);
  });
});

describe("detectLang (FR-08)", () => {
  it("returns km for Khmer script", () => {
    expect(detectLang("ខ្ញុំចង់បន្តប័ណ្ណបើកបរ")).toBe("km");
  });

  it("returns en for Latin script", () => {
    expect(detectLang("how do i renew my driving licence")).toBe("en");
  });

  it("returns en for romanised Khmer — answering in the script they typed fails softer", () => {
    expect(detectLang("sombot kamnaot trauv ke ekasa avei khlah")).toBe("en");
  });

  it("returns km for a Khmer sentence carrying an English loanword", () => {
    expect(detectLang("ខ្ញុំចង់បន្ត licence របស់ខ្ញុំ")).toBe("km");
  });

  it("needs at least two Khmer characters, so a stray glyph does not flip the language", () => {
    expect(detectLang("what is ក")).toBe("en");
    expect(detectLang("what is កខ")).toBe("km");
  });

  it("returns en for empty input rather than throwing", () => {
    expect(detectLang("")).toBe("en");
  });
});
