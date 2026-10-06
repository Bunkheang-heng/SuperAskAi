import { describe, it, expect } from "vitest";
import { processQuery, retrieve } from "@/lib/retrieval";
import { getKb } from "@/lib/kb/loader";

/**
 * Query processing and hybrid retrieval, against the live corpus.
 *
 * The follow-up resolution cases are the ones that matter. Prepending only the
 * previous turn produced "can you give me the specific locations? where in
 * phnom penh?" — a query with no subject at all — which then matched the
 * office-and-opening-hours passages of whatever the corpus happens to hold. A
 * passport question came back answered with driving-licence locations, cited
 * and confident.
 */

describe("processQuery", () => {
  it("keeps the raw question alongside the normalised form", () => {
    const q = processQuery("How do I renew my Driving Licence?");
    expect(q.raw).toBe("How do I renew my Driving Licence?");
    expect(q.normalised.length).toBeGreaterThan(0);
    expect(q.segments.length).toBeGreaterThan(0);
  });

  it("does not rewrite a question that carries its own subject", () => {
    const q = processQuery("how do i renew my driving licence", [
      { role: "user", text: "what documents do i need for a birth certificate" },
    ]);
    expect(q.rewritten).toBeUndefined();
  });

  it("does not rewrite when there is no history to lean on", () => {
    expect(processQuery("where in phnom penh?").rewritten).toBeUndefined();
  });

  describe("follow-up resolution (FR-07)", () => {
    const passportThread = [
      {
        role: "user" as const,
        text: "i dont have a passport, what do i need to bring to make my passport and where can i get it made?",
      },
      {
        role: "assistant" as const,
        text: "You can apply at the General Department of Immigration.",
      },
      { role: "user" as const, text: "can you give me the specific locations?" },
      {
        role: "assistant" as const,
        text: "The main office is on Russian Federation Boulevard.",
      },
    ];

    it("walks back past subject-less turns to the turn that names the subject", () => {
      const q = processQuery("where in phnom penh?", passportThread);
      expect(q.rewritten).toBeDefined();
      // The anchoring turn — the one that says "passport" — must be in there.
      expect(q.rewritten).toContain("passport");
    });

    it("keeps the subject-less turns in between, because they narrow the question", () => {
      const q = processQuery("where in phnom penh?", passportThread);
      // "locations" refines the question even though it cannot anchor it.
      expect(q.rewritten).toContain("specific locations");
      expect(q.rewritten).toContain("where in phnom penh?");
    });

    it("puts the turns back in chronological order, with the new question last", () => {
      const rewritten = processQuery("where in phnom penh?", passportThread).rewritten!;
      expect(rewritten.indexOf("passport")).toBeLessThan(
        rewritten.indexOf("specific locations"),
      );
      expect(rewritten.endsWith("where in phnom penh?")).toBe(true);
    });

    it("ignores assistant turns when anchoring — only what the citizen said counts", () => {
      const q = processQuery("and the fee?", [
        { role: "assistant", text: "vehicle registration is handled by MPWT" },
      ]);
      // The only prior turn is the assistant's, so there is nothing to anchor to.
      expect(q.rewritten).toBeUndefined();
    });

    it("resolves an anaphoric opener even when it is not short", () => {
      const q = processQuery(
        "and what about the situation where it has already expired",
        [{ role: "user", text: "how do i renew my driving licence" }],
      );
      expect(q.rewritten).toContain("driving licence");
    });

    it("resolves a Khmer anaphoric opener (FR-08)", () => {
      const q = processQuery("ចុះថ្លៃសេវា?", [
        { role: "user", text: "how do i renew my driving licence" },
      ]);
      expect(q.rewritten).toContain("driving licence");
    });

    it("stops at the first anchoring turn rather than dragging in the whole conversation", () => {
      const q = processQuery("where?", [
        { role: "user", text: "how do i register a company" },
        { role: "user", text: "how do i renew my driving licence" },
      ]);
      // The nearest turn that names a subject wins; the earlier one is not
      // dragged in behind it.
      expect(q.rewritten).toContain("driving licence");
      expect(q.rewritten).not.toContain("register a company");
    });

    it("gives up rather than reaching back indefinitely", () => {
      const many = Array.from({ length: 12 }, (_, i) => ({
        role: "user" as const,
        text: `ok ${i}`,
      }));
      const q = processQuery("where?", many);
      // Every turn is subject-less, so the lookback bounds the damage instead
      // of concatenating the entire conversation into the query.
      const turnCount = (q.rewritten ?? "").match(/\bok \d+/g)?.length ?? 0;
      expect(turnCount).toBeLessThanOrEqual(4);
    });

    it("does not rewrite an in-scope question against an earlier off-domain turn", () => {
      const q = processQuery("where in phnom penh?", [
        { role: "user", text: "what is the capital of france" },
        {
          role: "assistant",
          text: "SuperAsk only answers questions about Cambodian government service procedures",
        },
      ]);
      expect(q.rewritten ?? "").not.toMatch(/france/i);
    });

    it("does not glue refused short questions onto a later service question", () => {
      // Live leak: "who is elon musk?" + "what is law" + "how do I get married?"
      // became one retrieval query because all three have fewer than 3 content
      // words, so rewrite treated the marriage question as a follow-up.
      const q = processQuery("how do I get married?", [
        { role: "user", text: "who is elon musk?" },
        {
          role: "assistant",
          text: "SuperAsk only answers questions about Cambodian government service procedures",
        },
        { role: "user", text: "what is law" },
        {
          role: "assistant",
          text: "SuperAsk only answers questions about Cambodian government service procedures",
        },
      ]);
      expect(q.rewritten).toBeUndefined();
      expect(q.normalised).not.toMatch(/elon|musk|what is law/i);
    });

    it("does not glue a new service question onto a previous service topic", () => {
      const q = processQuery("how do I get married?", [
        { role: "user", text: "how do i renew my driving licence" },
        {
          role: "assistant",
          text: "Bring your old licence and national ID card.",
        },
      ]);
      expect(q.rewritten).toBeUndefined();
      expect(q.normalised).not.toMatch(/licence|license/i);
    });
  });

  describe("romanised Khmer (FR-03)", () => {
    it("flags romanised input and converts it to Khmer script before searching", () => {
      const q = processQuery("sombot kamnaot trauv ke ekasa avei khlah");
      expect(q.romanised).toBe(true);
      // Which script we SEARCH in and which we ANSWER in are separate
      // decisions — this one is search.
      expect(/[ក-៿]/.test(q.normalised)).toBe(true);
    });

    it("leaves ordinary English alone", () => {
      const q = processQuery("how do i renew my driving licence");
      expect(q.romanised).toBe(false);
      expect(/[ក-៿]/.test(q.normalised)).toBe(false);
    });
  });

  describe("alias expansion (FR-06)", () => {
    it("expands a colloquial term to official terminology", () => {
      const [colloquial, official] = Object.entries(getKb().aliases)[0];
      const q = processQuery(colloquial);
      expect(q.expanded).toEqual(expect.arrayContaining([official[0]]));
    });

    it("adds nothing for a query with no alias in it", () => {
      expect(processQuery("zzzz qqqq").expanded).toEqual([]);
    });

    it("deduplicates when two colloquial terms expand to the same official one", () => {
      const q = processQuery("licence licence driving driving");
      expect(new Set(q.expanded).size).toBe(q.expanded.length);
    });
  });
});

describe("retrieve — hybrid retrieval over the live corpus", () => {
  it("returns candidates ranked by rerank score, not fused score (FR-13)", () => {
    const { candidates } = retrieve("how do i renew my driving licence");
    expect(candidates.length).toBeGreaterThan(0);
    for (let i = 1; i < candidates.length; i += 1) {
      expect(candidates[i - 1].rerank).toBeGreaterThanOrEqual(candidates[i].rerank);
    }
  });

  it("reports topScore as the top candidate's rerank score", () => {
    const { candidates, topScore } = retrieve("how do i renew my driving licence");
    expect(topScore).toBe(candidates[0].rerank);
  });

  it("still returns candidates for gibberish — it is the FR-16 floor that refuses, not an empty list", () => {
    // The dense index is a hashed character-n-gram vector and scores EVERY
    // chunk, so the fused set is never empty and `candidates.length === 0` is
    // not the refusal path. Worth pinning explicitly: a caller that treated an
    // empty list as "nothing matched" would never refuse anything.
    const { candidates, topScore } = retrieve("zzzzqqqq wwwwvvvv");
    expect(candidates.length).toBeGreaterThan(0);
    expect(topScore).toBeLessThan(0.2);
  });

  it("scores a real question well above the floor the gibberish falls below", () => {
    const good = retrieve("how do i renew my driving licence").topScore;
    const junk = retrieve("zzzzqqqq wwwwvvvv").topScore;
    expect(good).toBeGreaterThan(0.2);
    expect(good).toBeGreaterThan(junk);
  });

  it("honours topK", () => {
    expect(retrieve("driving licence", [], 3).candidates.length).toBeLessThanOrEqual(3);
    expect(retrieve("driving licence", [], 8).candidates.length).toBeLessThanOrEqual(8);
  });

  it("defaults to 8, the depth M-03 is defined against", () => {
    expect(retrieve("driving licence").candidates.length).toBeLessThanOrEqual(8);
  });

  it("normalises the fused score into 0–1", () => {
    for (const c of retrieve("driving licence").candidates) {
      expect(c.fused).toBeGreaterThanOrEqual(0);
      expect(c.fused).toBeLessThanOrEqual(1);
    }
  });

  it("carries the component scores for the FR-72 trace", () => {
    const [top] = retrieve("how do i renew my driving licence").candidates;
    expect(top).toMatchObject({
      lexical: expect.any(Number),
      dense: expect.any(Number),
      fused: expect.any(Number),
      rerank: expect.any(Number),
      cited: false,
    });
  });

  it("finds the driving-licence content for the question the landing page suggests", () => {
    const { candidates } = retrieve("How do I renew my driving licence?");
    expect(candidates[0].chunk.id).toMatch(/^MPWT-DL-/);
  });

  it("answers the same question asked in Khmer from the same ministry (FR-08)", () => {
    const { candidates } = retrieve("ខ្ញុំចង់បន្តប័ណ្ណបើកបរ");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].chunk.ministry).toContain("Public Works");
  });

  it("never returns superseded content (FR-18, FR-58)", () => {
    for (const q of ["driving licence", "birth certificate", "trademark", "fee"]) {
      for (const c of retrieve(q).candidates) {
        expect(c.chunk.superseded, `${q} → ${c.chunk.id}`).not.toBe(true);
      }
    }
  });

  it("returns a chunk that exists in the corpus index", () => {
    const kb = getKb();
    for (const c of retrieve("driving licence").candidates) {
      expect(kb.byId.has(c.chunk.id)).toBe(true);
    }
  });

  it("is deterministic — the same query twice returns the same ranking", () => {
    const a = retrieve("how do i renew my driving licence").candidates.map((c) => c.chunk.id);
    const b = retrieve("how do i renew my driving licence").candidates.map((c) => c.chunk.id);
    expect(a).toEqual(b);
  });

  it("uses the resolved follow-up, not the bare question, to retrieve", () => {
    const bare = retrieve("and the fee?").candidates[0]?.chunk.id;
    const resolved = retrieve("and the fee?", [
      { role: "user", text: "How do I renew my Cambodian driving licence?" },
    ]).candidates[0]?.chunk.id;

    expect(resolved).toMatch(/^MPWT-DL-/);
    expect(resolved).not.toBe(bare);
  });
});
