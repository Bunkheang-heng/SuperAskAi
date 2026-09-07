import { describe, it, expect } from "vitest";
import { looksRomanised, romanizeToKhmer } from "@/lib/khmer/romanize";

/**
 * FR-03. Citizens on Latin keyboards type "bat robous bek bor" constantly, and
 * the index holds Khmer script only — without this mapping those queries
 * retrieve nothing at all.
 *
 * Which script we SEARCH in and which we ANSWER in are separate decisions;
 * this module is only the first one. detectLang still returns "en" for Latin
 * input, deliberately.
 */

describe("looksRomanised", () => {
  it.each([
    "bat bek bor",
    "sombot kamnert",
    "chos banhchi",
    "sievphov kruosar",
    "thlai sevea",
    "trov kar ekasa",
  ])("recognises romanised service vocabulary: %s", (input) => {
    expect(looksRomanised(input)).toBe(true);
  });

  it("recognises a romanised phrase inside a longer sentence", () => {
    expect(looksRomanised("i need a sombot kamnert for my son")).toBe(true);
  });

  it("is false for Khmer script — it is already in the right script", () => {
    expect(looksRomanised("ប័ណ្ណបើកបរ")).toBe(false);
  });

  it("is false for ordinary English", () => {
    expect(looksRomanised("how do i renew my driving licence")).toBe(false);
  });

  it("does not fire on 'prakas' — the substring bug the docstring names", () => {
    // "prakas" contains "prak" (ប្រាក់, money). Substring matching made
    // "what does prakas mean" look like romanised Khmer, so the detector chose
    // Khmer and answered an English question in Khmer script.
    expect(looksRomanised("what does prakas mean")).toBe(false);
    expect(looksRomanised("prakas no. 047")).toBe(false);
  });

  it("still fires on 'prak' as a standalone word", () => {
    expect(looksRomanised("bong prak nov ea na")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(looksRomanised("SOMBOT KAMNERT")).toBe(true);
  });

  it("is false for an empty string", () => {
    expect(looksRomanised("")).toBe(false);
  });
});

describe("romanizeToKhmer", () => {
  it("maps a known phrase to Khmer script", () => {
    expect(romanizeToKhmer("bat bek bor")).toContain("ប័ណ្ណបើកបរ");
  });

  it("prefers the longest phrase, so multi-word forms beat their parts", () => {
    // "bat robous bek bor" and "bek bor" both match; the longer must win, or
    // the query becomes a fragment of the term the citizen meant.
    expect(romanizeToKhmer("bat robous bek bor")).toContain("ប័ណ្ណបើកបរ");
    expect(romanizeToKhmer("thlai sevea")).toContain("ថ្លៃសេវា");
  });

  it("leaves surrounding text intact", () => {
    const out = romanizeToKhmer("i need a sombot kamnert today");
    expect(out).toContain("សំបុត្រកំណើត");
    expect(out).toContain("today");
  });

  it("returns the original string unchanged when nothing matches", () => {
    const input = "How do I renew my driving licence?";
    expect(romanizeToKhmer(input)).toBe(input);
  });

  it("is safe to apply to Khmer script — nothing matches, nothing changes", () => {
    const input = "ខ្ញុំចង់បន្តប័ណ្ណបើកបរ";
    expect(romanizeToKhmer(input)).toBe(input);
  });

  it("does not rewrite 'prakas'", () => {
    const input = "what does prakas mean";
    expect(romanizeToKhmer(input)).toBe(input);
  });

  it("maps several phrases in one query", () => {
    const out = romanizeToKhmer("sombot kamnert trov kar ekasa");
    expect(out).toContain("សំបុត្រកំណើត");
    expect(out).toContain("ត្រូវការ");
    expect(out).toContain("ឯកសារ");
  });

  it("does not eat the characters around a replaced phrase", () => {
    // The capture groups exist because a plain split/join consumed the
    // boundary characters.
    const out = romanizeToKhmer("(sombot kamnert)");
    expect(out).toContain("(");
    expect(out).toContain(")");
  });

  it("agrees with looksRomanised — anything it flags, it also rewrites", () => {
    const probes = [
      "bat bek bor",
      "sombot kamnert",
      "chos banhchi",
      "khum sangkat",
      "bangkan dai",
    ];
    for (const p of probes) {
      expect(looksRomanised(p), p).toBe(true);
      expect(romanizeToKhmer(p), p).not.toBe(p);
    }
  });

  it("handles an empty string", () => {
    expect(romanizeToKhmer("")).toBe("");
  });
});
