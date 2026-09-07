import { describe, it, expect } from "vitest";
import { fuse, MAX_RRF } from "@/lib/retrieval/rrf";
import { Bm25Index } from "@/lib/retrieval/bm25";
import { embed, cosine, VectorIndex } from "@/lib/retrieval/embed";
import { rerank, rerankOne } from "@/lib/retrieval/rerank";
import { segment } from "@/lib/khmer/segment";
import type { Chunk } from "@/lib/types";

function chunk(over: Partial<Chunk> & { id: string }): Chunk {
  return {
    ministry: "Ministry of Public Works and Transport",
    ministryKm: "ក្រសួងសាធារណការ",
    doc: "Driver's Licence",
    instrument: "Prakas No. 047 SK",
    article: "Not cited on source page",
    effective: "2017-01-27",
    verified: "2026-07-31",
    reviewDue: "2027-01-31",
    geoScope: "KH",
    sensitivity: "public",
    text: "",
    keywords: [],
    questions: [],
    ...over,
  };
}

describe("fuse — reciprocal rank fusion (FR-12)", () => {
  it("fuses ranks, not magnitudes", () => {
    // BM25 scores are unbounded, cosine is 0–1. If magnitudes were added, the
    // lexical signal would dominate for reasons unrelated to relevance.
    const lexical = new Map([["a", 900], ["b", 1]]);
    const dense = new Map([["a", 0.1], ["b", 0.99]]);
    const out = fuse(lexical, dense);
    // a: rank 1 lexical, rank 2 dense. b: rank 2 lexical, rank 1 dense.
    expect(out.get("a")).toBeCloseTo(out.get("b")!);
  });

  it("ranks a document appearing top in both signals above one appearing in either alone", () => {
    const lexical = new Map([["both", 10], ["lexOnly", 9]]);
    const dense = new Map([["both", 0.9], ["denseOnly", 0.8]]);
    const out = fuse(lexical, dense);
    expect(out.get("both")!).toBeGreaterThan(out.get("lexOnly")!);
    expect(out.get("both")!).toBeGreaterThan(out.get("denseOnly")!);
  });

  it("includes documents found by only one signal", () => {
    const out = fuse(new Map([["a", 1]]), new Map([["b", 1]]));
    expect(out.has("a")).toBe(true);
    expect(out.has("b")).toBe(true);
  });

  it("never exceeds MAX_RRF, so the confidence band stays 0–1", () => {
    const out = fuse(new Map([["a", 1]]), new Map([["a", 1]]));
    expect(out.get("a")!).toBeLessThanOrEqual(MAX_RRF);
    expect(out.get("a")!).toBeCloseTo(MAX_RRF);
  });

  it("returns an empty map for empty inputs", () => {
    expect(fuse(new Map(), new Map()).size).toBe(0);
  });
});

describe("Bm25Index", () => {
  const chunks = [
    chunk({
      id: "DL-1",
      text: "To renew a driving licence bring the old licence and an identity card.",
      questions: ["how do i renew my driving licence"],
      keywords: ["driving licence", "renew"],
    }),
    chunk({
      id: "CR-1",
      text: "Birth registration is carried out at the commune administration.",
      questions: ["how do i register a birth"],
      keywords: ["birth registration"],
    }),
  ];
  const index = new Bm25Index(chunks);

  it("scores the on-topic chunk above the off-topic one", () => {
    const scores = index.score(segment("renew driving licence"));
    expect(scores.get("DL-1")!).toBeGreaterThan(scores.get("CR-1") ?? 0);
  });

  it("indexes the generated questions, not only the body (FR-44)", () => {
    // "how do i register a birth" appears only in CR-1's questions field.
    const scores = index.score(segment("register a birth"));
    expect(scores.get("CR-1")).toBeDefined();
  });

  it("omits chunks that score zero rather than returning noise", () => {
    const scores = index.score(segment("cement tariff"));
    expect(scores.size).toBe(0);
  });

  it("excludes superseded content (FR-18, FR-58)", () => {
    const withSuperseded = new Bm25Index([
      ...chunks,
      chunk({ id: "OLD-1", text: "The renewal fee was 20,000 riel.", superseded: true }),
    ]);
    const scores = withSuperseded.score(segment("renewal fee"));
    expect(scores.has("OLD-1")).toBe(false);
  });

  it("survives an empty corpus without dividing by zero", () => {
    const empty = new Bm25Index([]);
    expect(empty.score(segment("anything")).size).toBe(0);
  });

  it("gives a rarer term more weight than one in every document", () => {
    const scores = index.score(segment("licence"));
    const common = index.score(segment("the"));
    expect(scores.get("DL-1")!).toBeGreaterThan(common.get("DL-1") ?? 0);
  });
});

describe("embed — hashed character n-grams", () => {
  it("is deterministic across calls", () => {
    expect(Array.from(embed("driving licence"))).toEqual(
      Array.from(embed("driving licence")),
    );
  });

  it("is L2-normalised, so cosine is a true similarity", () => {
    const v = embed("driving licence renewal");
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(mag).toBeCloseTo(1, 5);
  });

  it("scores identical text at 1", () => {
    expect(cosine(embed("birth certificate"), embed("birth certificate"))).toBeCloseTo(1, 5);
  });

  it("scores related text above unrelated text", () => {
    const q = embed("driving licence renewal");
    const near = cosine(q, embed("renewing a driving licence"));
    const far = cosine(q, embed("consumer finance interest rate caps"));
    expect(near).toBeGreaterThan(far);
  });

  it("is case-insensitive, because it folds before hashing", () => {
    expect(cosine(embed("Driving Licence"), embed("driving licence"))).toBeCloseTo(1, 5);
  });

  it("handles Khmer without depending on segmentation being correct", () => {
    const sim = cosine(embed("ប័ណ្ណបើកបរ"), embed("បន្តប័ណ្ណបើកបរ"));
    expect(sim).toBeGreaterThan(0.3);
  });

  it("returns a zero-safe vector for empty input", () => {
    expect(() => embed("")).not.toThrow();
    expect(embed("").every((x) => x === 0)).toBe(true);
  });
});

describe("VectorIndex", () => {
  const index = new VectorIndex([
    chunk({
      id: "DL-1",
      text: "To renew a driving licence bring the old licence.",
      questions: ["how do i renew my driving licence"],
    }),
    chunk({
      id: "NBC-1",
      text: "Interest rate caps on consumer loans are set by the National Bank.",
      questions: ["what is the maximum interest rate"],
    }),
  ]);

  it("maps similarity into 0–1", () => {
    for (const score of index.score("driving licence").values()) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("ranks the on-topic chunk first", () => {
    const scores = index.score("how do i renew my driving licence");
    expect(scores.get("DL-1")!).toBeGreaterThan(scores.get("NBC-1")!);
  });

  it("keeps the best field match per chunk rather than averaging", () => {
    // The question field is a near-exact match; averaging it with the body
    // would drag the score toward a vector resembling neither.
    const scores = index.score("how do i renew my driving licence");
    expect(scores.get("DL-1")!).toBeGreaterThan(0.7);
  });

  it("excludes superseded content", () => {
    const withSuperseded = new VectorIndex([
      chunk({ id: "OLD-1", text: "Old fee schedule.", superseded: true }),
    ]);
    expect(withSuperseded.score("fee schedule").has("OLD-1")).toBe(false);
  });
});

describe("rerankOne (FR-13)", () => {
  const dl = chunk({
    id: "DL-1",
    text: "To renew a driving licence bring the old licence and an identity card.",
    questions: ["how do i renew my driving licence", "how do i extend my licence"],
    keywords: ["driving licence", "renew", "licence renewal"],
  });

  it("returns a score in roughly 0–1", () => {
    const score = rerankOne("how do i renew my driving licence", dl);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("weights exact question agreement most heavily", () => {
    const exact = rerankOne("how do i renew my driving licence", dl);
    const bodyOnly = rerankOne("bring the old identity card", dl);
    expect(exact).toBeGreaterThan(bodyOnly);
  });

  it("scores an unrelated query near zero", () => {
    expect(rerankOne("cement import tariff", dl)).toBeLessThan(0.1);
  });

  it("counts multi-word keyword phrases as one hit", () => {
    const withPhrase = rerankOne("what is the licence renewal process", dl);
    expect(withPhrase).toBeGreaterThan(0);
  });

  it("caps the keyword component so keyword stuffing cannot dominate", () => {
    const stuffed = chunk({
      id: "S-1",
      text: "x",
      questions: [],
      keywords: Array.from({ length: 20 }, () => "renew"),
    });
    expect(rerankOne("renew", stuffed)).toBeLessThanOrEqual(0.25 + 1e-9);
  });
});

describe("rerank", () => {
  it("sorts candidates by score, descending", () => {
    const candidates = [
      chunk({ id: "NBC-1", text: "Interest rate caps.", questions: ["what is the rate cap"] }),
      chunk({
        id: "DL-1",
        text: "Renew a driving licence.",
        questions: ["how do i renew my driving licence"],
      }),
    ];
    const ranked = rerank("how do i renew my driving licence", candidates);
    expect(ranked[0].chunk.id).toBe("DL-1");
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it("returns every candidate it was given", () => {
    const candidates = [chunk({ id: "A" }), chunk({ id: "B" }), chunk({ id: "C" })];
    expect(rerank("anything", candidates)).toHaveLength(3);
  });

  it("handles an empty candidate set", () => {
    expect(rerank("anything", [])).toEqual([]);
  });
});
