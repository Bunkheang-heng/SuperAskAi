import { describe, it, expect } from "vitest";
import {
  normalize,
  normalizeFold,
  hasKhmer,
  containsWord,
  khmerDigitsToAscii,
} from "@/lib/khmer/normalize";

describe("normalize", () => {
  it("returns empty string for empty input", () => {
    expect(normalize("")).toBe("");
  });

  it("collapses whitespace runs and trims", () => {
    expect(normalize("  how   do  i \n renew  ")).toBe("how do i renew");
  });

  it("strips zero-width characters that survive PDF copy/paste", () => {
    // ZWSP, ZWNJ, ZWJ, word joiner, BOM, soft hyphen.
    const dirty = "ប័​ណ្ណ‌បើ‍ក⁠ប﻿រ­";
    expect(normalize(dirty)).toBe(normalize("ប័ណ្ណបើកបរ"));
  });

  it("is idempotent — normalising twice equals normalising once (FR-05)", () => {
    const inputs = [
      "ប័ណ្ណបើកបរ",
      "សំបុត្រកំណើត",
      "How do I renew my driving licence?",
      "ខ្ញុំចង់ចុះបញ្ជីក្រុមហ៊ុន",
    ];
    for (const input of inputs) {
      expect(normalize(normalize(input))).toBe(normalize(input));
    }
  });

  it("orders a subscript before a vowel sign within one cluster", () => {
    // ក + vowel ា + COENG ក  vs  ក + COENG ក + vowel ា — same cluster,
    // different typing order. Canonical order puts the subscript first.
    const vowelFirst = "កា្ក";
    const coengFirst = "ក្កា";
    expect(normalize(vowelFirst)).toBe(normalize(coengFirst));
    expect(normalize(vowelFirst)).toBe(coengFirst);
  });

  it("orders a vowel sign before a diacritic within one cluster", () => {
    // ក + NIKAHIT ំ + vowel ា  vs  ក + vowel ា + NIKAHIT ំ
    const diacriticFirst = "កំា";
    const vowelFirst = "កាំ";
    expect(normalize(diacriticFirst)).toBe(normalize(vowelFirst));
  });

  it("does not merge marks across two different base consonants", () => {
    // Two clusters must stay two clusters — reordering is per-cluster.
    const out = normalize("កា្កខិ");
    expect(out.startsWith("ក")).toBe(true);
    expect(out).toContain("ខ");
  });

  it("leaves Latin text untouched apart from whitespace", () => {
    expect(normalize("Prakas No. 047")).toBe("Prakas No. 047");
  });

  it("applies NFC composition", () => {
    // e + combining acute → é
    expect(normalize("é")).toBe("é");
  });
});

describe("normalizeFold", () => {
  it("case-folds Latin", () => {
    expect(normalizeFold("Driving LICENCE")).toBe("driving licence");
  });

  it("agrees with normalize on Khmer, which has no case", () => {
    expect(normalizeFold("ប័ណ្ណបើកបរ")).toBe(normalize("ប័ណ្ណបើកបរ"));
  });
});

describe("khmerDigitsToAscii", () => {
  it("maps the full Khmer digit range", () => {
    expect(khmerDigitsToAscii("០១២៣៤៥៦៧៨៩")).toBe("0123456789");
  });

  it("maps digits embedded in Khmer text", () => {
    expect(khmerDigitsToAscii("៣០ ថ្ងៃ")).toBe("30 ថ្ងៃ");
  });

  it("leaves ASCII digits alone", () => {
    expect(khmerDigitsToAscii("30 days")).toBe("30 days");
  });
});

describe("hasKhmer", () => {
  it("detects Khmer script", () => {
    expect(hasKhmer("ប័ណ្ណ")).toBe(true);
  });

  it("is false for pure Latin, including romanised Khmer", () => {
    expect(hasKhmer("sombot kamnaot")).toBe(false);
  });

  it("is true for mixed script", () => {
    expect(hasKhmer("renew my ប័ណ្ណបើកបរ")).toBe(true);
  });
});

describe("containsWord", () => {
  // These two are regression tests for named bugs in the module docstring.
  it("does not match a Latin phrase inside a longer word", () => {
    // "hi" once matched "which", serving a greeting for a wayfinding question.
    expect(containsWord("which office holds my file", "hi")).toBe(false);
  });

  it("does not match the romanisation 'prak' inside 'prakas'", () => {
    expect(containsWord("what does prakas mean", "prak")).toBe(false);
  });

  it("matches a Latin phrase at a word boundary", () => {
    expect(containsWord("say hi there", "hi")).toBe(true);
  });

  it("matches a Latin phrase at the start and end of the text", () => {
    expect(containsWord("hi", "hi")).toBe(true);
    expect(containsWord("oh hi", "hi")).toBe(true);
    expect(containsWord("hi!", "hi")).toBe(true);
  });

  it("treats punctuation as a boundary but not digits or letters", () => {
    expect(containsWord("renew-licence", "renew")).toBe(true);
    expect(containsWord("renew2", "renew")).toBe(false);
  });

  it("matches a multi-word Latin phrase", () => {
    expect(containsWord("what is the late registration fee", "late registration")).toBe(
      true,
    );
  });

  it("uses substring containment for Khmer, which has no word boundaries", () => {
    expect(containsWord("ខ្ញុំចង់បន្តប័ណ្ណបើកបរ", "ប័ណ្ណបើកបរ")).toBe(true);
  });

  it("escapes regex metacharacters in the phrase", () => {
    expect(containsWord("a plus b", "a+b")).toBe(false);
    expect(containsWord("what is a+b", "a+b")).toBe(true);
  });

  it("is case-insensitive for Latin", () => {
    expect(containsWord("renew my LICENCE now", "licence")).toBe(true);
  });
});
