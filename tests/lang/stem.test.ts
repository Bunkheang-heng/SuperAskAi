import { describe, it, expect } from "vitest";
import { stem, normaliseWord } from "@/lib/lang/stem";
import { segment } from "@/lib/khmer/segment";
import { STOPWORDS, contentTerms, isSubjectless } from "@/lib/lang/content";

describe("stem — English suffix stripping (FR-05)", () => {
  it("agrees across the inflections that were losing retrieval matches", () => {
    // Each pair is a real failure from the golden set: the citizen's wording and
    // the chunk's own candidate question were different tokens, so the strongest
    // rerank signal scored near zero. See the header of lib/lang/stem.ts.
    const pairs: Array<[string, string]> = [
      ["registering", "register"],
      ["days", "day"],
      ["expires", "expired"],
      ["renewal", "renew"],
      ["renewing", "renew"],
      ["documents", "document"],
      ["fees", "fee"],
      ["driving", "drive"],
      ["payment", "pay"],
      ["losing", "lose"],
      ["copies", "copy"],
    ];
    for (const [a, b] of pairs) {
      expect(normaliseWord(a), `${a} vs ${b}`).toBe(normaliseWord(b));
    }
  });

  it("folds Commonwealth and US spellings of the same word", () => {
    // Cambodian government English uses "licence"; citizens type either.
    expect(normaliseWord("license")).toBe(normaliseWord("licence"));
    expect(normaliseWord("licenses")).toBe(normaliseWord("licence"));
  });

  it("leaves every stem a prefix of the word it came from", () => {
    // Load-bearing: lib/engine/topicality.ts substring-matches stemmed query
    // terms against RAW source text. A stem that is not a prefix silently stops
    // matching its own source, which is why Porter's terminal y -> i is omitted.
    const words = [
      "driving", "licence", "renewal", "registering", "expired", "documents",
      "payment", "losing", "vehicles", "witnesses", "applied", "copy", "salary",
    ];
    for (const w of words) {
      expect(w.startsWith(stem(w)), `${w} -> ${stem(w)}`).toBe(true);
    }
  });

  it("does not strip short words or anything carrying a digit", () => {
    expect(stem("fee")).toBe("fee");
    expect(stem("id")).toBe("id");
    expect(stem("a4")).toBe("a4");
    expect(stem("30days")).toBe("30days");
  });

  it("does not treat ss or us endings as plurals", () => {
    // Over-stemming collapses distinct government terms, which costs precision.
    expect(stem("address")).toBe("address");
    expect(stem("process")).toBe("process");
    expect(stem("access")).toBe("access");
    expect(stem("status")).toBe("status");
  });

  it("never returns a stem too short to discriminate", () => {
    for (const w of ["ages", "eyes", "uses", "sees"]) {
      expect(stem(w).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("leaves Khmer untouched — it does not inflect this way", () => {
    const km = "ប័ណ្ណបើកបរ";
    expect(segment(km).every((t) => !/[a-z]/.test(t))).toBe(true);
    expect(stem(km)).toBe(km);
  });
});

describe("stemming and the stoplists stay in step", () => {
  it("stops every authored stopword after segmentation stems it", () => {
    // The regression this pins: STOPWORDS is authored in ordinary English, but
    // it is filtered against segment() output, which is stemmed. Comparing the
    // two directly let "give" (as "giv") and "locations" (as "locat") through,
    // which made a subject-less follow-up look substantive and re-opened FR-07.
    for (const word of STOPWORDS) {
      expect(contentTerms(word), `stopword "${word}" leaked through`).toEqual([]);
    }
  });

  it("still sees a deictic follow-up as naming nothing", () => {
    expect(isSubjectless("can you give me the specific locations?")).toBe(true);
    expect(isSubjectless("where in phnom penh?")).toBe(true);
  });

  it("still sees a question that names a service as substantive", () => {
    expect(isSubjectless("how do i renew my driving licence")).toBe(false);
  });
});

describe("citizen-facing text never shows stems", () => {
  it("reports uncovered terms in the wording the citizen typed", async () => {
    const { assess } = await import("@/lib/engine/topicality");
    // Matching runs on stems; the warning in lib/engine/tiers.ts interpolates
    // `missing` straight into the answer, so "licenc, vehicl" must never reach
    // a citizen. Pins the surface-form mapping in lib/lang/content.ts.
    const t = assess(
      "i missed the thirty day window for registering a birth",
      "Late birth registration requires two witness statements.",
    );
    for (const term of [...t.missing, ...t.covered]) {
      expect(
        ["miss", "licenc", "vehicl", "registrat", "driv", "compani"],
        `stem "${term}" leaked into citizen-facing text`,
      ).not.toContain(term);
    }
    expect(t.missing).toContain("missed");
  });
});
