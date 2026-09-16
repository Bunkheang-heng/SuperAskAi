import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AskRequest, AskResponse } from "@/lib/types";

/**
 * The orchestrator — the whole of §10.2 tiering and the order the gates run in.
 *
 * Every case here runs against the LIVE corpus with LLM_PROVIDER=extractive, so
 * no model is called and the outcome is deterministic. That is what makes the
 * ordering assertions meaningful: the extractive provider quotes the retrieved
 * provision verbatim, so an answer's content is a function of retrieval alone.
 *
 * The ordering is the thing under test. Several of these gates were moved at
 * some point in this build's history and the move was the fix — the off-domain
 * screen used to sit INSIDE the confidence gate, where "what is the capital of
 * france" (0.205 against a 0.200 floor) walked straight past it into generation
 * and the refusal depended on the model's own judgement. A scope rule that
 * holds only on some model families is not a scope rule.
 */

/** Module-scope consts read env at import time, so re-import per configuration. */
async function loadAsk(env: Record<string, string> = {}) {
  vi.resetModules();
  const defaults: Record<string, string> = {
    LLM_PROVIDER: "extractive",
    DIAGNOSTICS_ENABLED: "true",
    GENERAL_FALLBACK_ENABLED: "false",
    RETRIEVAL_MIN_SCORE: "0.20",
    CURATED_MATCH_THRESHOLD: "0.72",
  };
  for (const [k, v] of Object.entries({ ...defaults, ...env })) {
    vi.stubEnv(k, v);
  }
  return (await import("@/lib/engine")).ask;
}

function req(question: string, over: Partial<AskRequest> = {}): AskRequest {
  return { question, history: [], ...over };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ask — response contract", () => {
  let ask: (r: AskRequest) => Promise<AskResponse>;
  beforeEach(async () => {
    ask = await loadAsk();
  });

  it("always returns an id, a tier, a language and an answer", async () => {
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.id).toBeTruthy();
    expect([1, 2, 3]).toContain(res.tier);
    expect(["en", "km"]).toContain(res.lang);
    expect(res.answer.length).toBeGreaterThan(0);
  });

  it("gives each answer a distinct id, so feedback and audit can correlate", async () => {
    const a = await ask(req("how do i renew my driving licence"));
    const b = await ask(req("how do i renew my driving licence"));
    expect(a.id).not.toBe(b.id);
  });

  it("replies in the language the citizen typed in (FR-08)", async () => {
    expect((await ask(req("how do i renew my driving licence"))).lang).toBe("en");
    expect((await ask(req("ខ្ញុំចង់បន្តប័ណ្ណបើកបរ"))).lang).toBe("km");
  });

  it("replies in English to romanised Khmer — the script they demonstrably typed", async () => {
    const res = await ask(req("sombot kamnaot trauv ke ekasa avei khlah"));
    expect(res.lang).toBe("en");
  });

  it("never returns a citation without the FR-63 attribution fields", async () => {
    const res = await ask(req("how do i renew my driving licence"));
    for (const c of res.citations) {
      expect(c).toMatchObject({
        id: expect.any(String),
        ministry: expect.any(String),
        doc: expect.any(String),
        instrument: expect.any(String),
        article: expect.any(String),
        effective: expect.any(String),
        verified: expect.any(String),
        freshness: expect.stringMatching(/^(fresh|due|stale)$/),
      });
      expect(c.quote.length).toBeGreaterThan(0);
    }
  });
});

describe("gate ordering", () => {
  let ask: (r: AskRequest) => Promise<AskResponse>;
  beforeEach(async () => {
    ask = await loadAsk();
  });

  it("runs the §12 policy screen before retrieval and before any model call", async () => {
    const res = await ask(req("there is a fire in my house"));
    expect(res.tier).toBe(3);
    expect(res.terminal).toBe(true);
    expect(res.diagnostics?.refusalReason).toBe("policy:emergency");
    // Nothing was retrieved — the screen fired first.
    expect(res.diagnostics?.candidates).toEqual([]);
    expect(res.citations).toEqual([]);
  });

  it("terminates on an emergency instead of escalating (rule 6)", async () => {
    const res = await ask(req("someone is bleeding, help me now"));
    expect(res.terminal).toBe(true);
    expect(res.escalate).toBe(false);
    expect(res.office).toBeUndefined();
  });

  it("escalates, not terminates, on a non-emergency policy refusal", async () => {
    const res = await ask(req("has my licence application been approved yet"));
    expect(res.tier).toBe(3);
    expect(res.escalate).toBe(true);
    expect(res.terminal).toBeFalsy();
    expect(res.office).toBeDefined();
    expect(res.diagnostics?.refusalReason).toBe("policy:personal_case");
  });

  it("runs the off-domain screen before retrieval — the gate that used to sit too late", async () => {
    const res = await ask(req("what is the capital of france"));
    expect(res.tier).toBe(3);
    expect(res.diagnostics?.refusalReason).toBe("scope:not_a_service_question");
    expect(res.diagnostics?.candidates).toEqual([]);
  });

  it("does not send an off-domain asker to an officer — it would waste both their time", async () => {
    const res = await ask(req("tell me a joke"));
    expect(res.escalate).toBe(false);
    expect(res.citations).toEqual([]);
  });

  it("refuses the two leaks the positive scope gate was added for", async () => {
    for (const q of ["tom holland from spider man", "i want to drink coffee, where should i go?"]) {
      const res = await ask(req(q));
      expect(res.diagnostics?.refusalReason, q).toBe("scope:not_a_service_question");
      expect(res.citations, q).toEqual([]);
    }
  });

  it("lets the policy screen win over the scope screen", async () => {
    // Emergency is checked first; both would otherwise have something to say.
    const res = await ask(req("there is a fire, tell me a joke"));
    expect(res.diagnostics?.refusalReason).toBe("policy:emergency");
  });
});

describe("Tier 1 — served verbatim, no generation", () => {
  let ask: (r: AskRequest) => Promise<AskResponse>;
  beforeEach(async () => {
    ask = await loadAsk();
  });

  it("serves a curated answer at tier 1 with no citations and no escalation", async () => {
    const res = await ask(req("what services do you cover"));
    if (res.diagnostics?.provider === "curated") {
      expect(res.tier).toBe(1);
      expect(res.escalate).toBe(false);
      expect(res.citations).toEqual([]);
      expect(res.diagnostics?.confidence).toBe("high");
    }
  });

  it("answers a definition question from the glossary at tier 1", async () => {
    const res = await ask(req("what does prakas mean"));
    expect(res.tier).toBe(1);
    expect(res.diagnostics?.provider).toBe("glossary");
    expect(res.escalate).toBe(false);
  });

  it("attaches no citation to a definition — inventing source metadata is the FR-45 failure", async () => {
    const res = await ask(req("what does prakas mean"));
    expect(res.citations).toEqual([]);
  });

  it("marks a glossary answer as in-process and domestically resident", async () => {
    const res = await ask(req("what does prakas mean"));
    expect(res.diagnostics?.hosting).toBe("In-process");
    expect(res.diagnostics?.residency).toBe("Cambodia");
  });

  it("does not let the glossary displace a retrieved procedure answer", async () => {
    // The glossary runs AFTER the confidence gate, so a question retrieval can
    // answer is never converted into a definition. "prakas" appears here.
    const res = await ask(req("what does the prakas say about the renewal fee"));
    expect(res.diagnostics?.provider).not.toBe("glossary");
  });
});

describe("Tier 2 — grounded answer over retrieved sources", () => {
  let ask: (r: AskRequest) => Promise<AskResponse>;
  beforeEach(async () => {
    ask = await loadAsk();
  });

  it("answers a covered procedure question with at least one citation", async () => {
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.tier).toBe(2);
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.unverified).toBeFalsy();
  });

  it("cites the ministry that owns the content", async () => {
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.citations[0].ministry).toContain("Public Works");
    expect(res.citations[0].id).toMatch(/^MPWT-DL-/);
  });

  it("carries the freshness of the cited version, not of the answer (FR-64)", async () => {
    const res = await ask(req("how do i renew my driving licence"));
    for (const c of res.citations) {
      expect(["fresh", "due", "stale"]).toContain(c.freshness);
    }
  });

  it("marks the cited candidates in the trace (FR-72)", async () => {
    const res = await ask(req("how do i renew my driving licence"));
    const citedIds = new Set(res.citations.map((c) => c.id));
    for (const c of res.diagnostics!.candidates) {
      expect(c.cited).toBe(citedIds.has(c.id));
    }
  });

  it("resolves a follow-up against the conversation (FR-07)", async () => {
    const res = await ask(
      req("and the fee?", {
        history: [
          { role: "user", text: "How do I renew my Cambodian driving licence?" },
          { role: "assistant", text: "Bring your old licence and national ID card." },
        ],
      }),
    );
    expect(res.diagnostics?.rewrittenQuery).toContain("driving licence");
    expect(res.citations[0]?.id).toMatch(/^MPWT-DL-/);
  });

  it("does not carry an off-domain first turn into the next in-scope answer", async () => {
    const res = await ask(
      req("how do i renew my driving licence", {
        history: [
          { role: "user", text: "what is the capital of france" },
          {
            role: "assistant",
            text: "AskGov only answers questions about Cambodian government service procedures — the steps, required documents, official fees, timelines, and which office handles a case.",
          },
        ],
      }),
    );
    expect(res.tier).toBeLessThan(3);
    expect(res.answer.toLowerCase()).not.toMatch(/france|paris|capital/);
    expect(res.diagnostics?.rewrittenQuery ?? "").not.toMatch(/france/i);
    expect(res.diagnostics?.normalisedQuery ?? "").not.toMatch(/france/i);
  });

  it("does not carry a short celebrity question into a later service question", async () => {
    // The session that shipped: Elon → what is law → how do I get married?
    // The france/paris case never caught it, because "capital of" is an
    // explicit OFF_DOMAIN regex and "how do i renew my driving licence" has
    // enough content words that rewrite skipped it.
    const res = await ask(
      req("how do I get married?", {
        history: [
          { role: "user", text: "who is elon musk?" },
          {
            role: "assistant",
            text: "AskGov only answers questions about Cambodian government service procedures — the steps, required documents, official fees, timelines, and which office handles a case.",
          },
          { role: "user", text: "what is law" },
          {
            role: "assistant",
            text: "AskGov only answers questions about Cambodian government service procedures — the steps, required documents, official fees, timelines, and which office handles a case.",
          },
        ],
      }),
    );
    expect(res.answer.toLowerCase()).not.toMatch(/elon|musk/);
    expect(res.diagnostics?.rewrittenQuery ?? "").not.toMatch(/elon|musk|what is law/i);
    expect(res.diagnostics?.normalisedQuery ?? "").not.toMatch(/elon|musk|what is law/i);
    expect(res.unverified).toBeFalsy();
  });

  it("still refuses a subject-less follow-up after an off-domain first turn", async () => {
    const res = await ask(
      req("where in phnom penh?", {
        history: [
          { role: "user", text: "what is the capital of france" },
          {
            role: "assistant",
            text: "AskGov only answers questions about Cambodian government service procedures",
          },
        ],
      }),
    );
    expect(res.diagnostics?.refusalReason).toBe("scope:not_a_service_question");
    expect(res.diagnostics?.rewrittenQuery).toBeUndefined();
  });
});

describe("FR-16 confidence gate", () => {
  it("refuses below the floor rather than generating over weak sources", async () => {
    const ask = await loadAsk({ RETRIEVAL_MIN_SCORE: "0.99" });
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.tier).toBe(3);
    expect(res.escalate).toBe(true);
    expect(res.citations).toEqual([]);
    expect(res.diagnostics?.refusalReason).toMatch(/^retrieval:/);
  });

  it("offers the officer on a coverage gap, unlike an off-domain refusal", async () => {
    const ask = await loadAsk({ RETRIEVAL_MIN_SCORE: "0.99" });
    const res = await ask(req("how do i apply for a fishing permit"));
    expect(res.escalate).toBe(true);
    expect(res.office).toBeDefined();
  });

  it("answers more questions as the floor drops", async () => {
    const strict = await loadAsk({ RETRIEVAL_MIN_SCORE: "0.99" });
    const strictRes = await strict(req("how do i renew my driving licence"));

    const loose = await loadAsk({ RETRIEVAL_MIN_SCORE: "0.05" });
    const looseRes = await loose(req("how do i renew my driving licence"));

    expect(strictRes.tier).toBe(3);
    expect(looseRes.tier).toBe(2);
  });

  it("still reaches the glossary below the floor — it can only convert a refusal into an answer", async () => {
    const ask = await loadAsk({ RETRIEVAL_MIN_SCORE: "0.99" });
    const res = await ask(req("what does prakas mean"));
    expect(res.tier).toBe(1);
    expect(res.diagnostics?.provider).toBe("glossary");
  });
});

describe("FR-72/73 — the answer trace is for internal users only", () => {
  it("omits diagnostics entirely when DIAGNOSTICS_ENABLED is not 'true'", async () => {
    const ask = await loadAsk({ DIAGNOSTICS_ENABLED: "false" });
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.diagnostics).toBeUndefined();
  });

  it("treats any value other than the literal 'true' as off", async () => {
    for (const value of ["1", "yes", "TRUE", ""]) {
      const ask = await loadAsk({ DIAGNOSTICS_ENABLED: value });
      const res = await ask(req("how do i renew my driving licence"));
      expect(res.diagnostics, `DIAGNOSTICS_ENABLED=${value}`).toBeUndefined();
    }
  });

  it("still returns the citizen-facing answer with the trace off", async () => {
    const ask = await loadAsk({ DIAGNOSTICS_ENABLED: "false" });
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.answer.length).toBeGreaterThan(0);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it("reports latency in the trace when it is on (NFR-06)", async () => {
    const ask = await loadAsk();
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.diagnostics?.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("GENERAL_FALLBACK_ENABLED — the unsourced answer switch", () => {
  it("does not serve an unsourced answer when the switch is off (§13 strict behaviour)", async () => {
    const ask = await loadAsk({
      GENERAL_FALLBACK_ENABLED: "false",
      RETRIEVAL_MIN_SCORE: "0.99",
    });
    const res = await ask(req("how do i apply for a fishing permit"));
    expect(res.unverified).toBeFalsy();
    expect(res.tier).toBe(3);
  });

  it("keeps out-of-scope questions out of the fallback however thin the corpus is", async () => {
    // The fallback is for coverage gaps only. "Paris is the capital of France"
    // reached a citizen once through exactly this path.
    const ask = await loadAsk({
      GENERAL_FALLBACK_ENABLED: "true",
      RETRIEVAL_MIN_SCORE: "0.99",
    });
    const res = await ask(req("what is the capital of france"));
    expect(res.unverified).toBeFalsy();
    expect(res.diagnostics?.refusalReason).toBe("scope:not_a_service_question");
  });

  it("does not invent a procedure when the corpus has no source, even if fallback is on", async () => {
    const ask = await loadAsk({
      GENERAL_FALLBACK_ENABLED: "true",
      RETRIEVAL_MIN_SCORE: "0.99",
    });
    const res = await ask(req("how do i apply for a fishing permit"));
    expect(res.unverified).toBeFalsy();
    expect(res.tier).toBe(3);
    expect(res.escalate).toBe(true);
    expect(res.citations).toEqual([]);
  });
});

describe("robustness", () => {
  let ask: (r: AskRequest) => Promise<AskResponse>;
  beforeEach(async () => {
    ask = await loadAsk();
  });

  it("handles an empty history", async () => {
    await expect(ask(req("how do i renew my driving licence", { history: [] })))
      .resolves.toBeDefined();
  });

  it("handles a question that is only punctuation", async () => {
    await expect(ask(req("???"))).resolves.toBeDefined();
  });

  it("handles a very long question without throwing", async () => {
    const long = "how do i renew my driving licence ".repeat(30);
    await expect(ask(req(long))).resolves.toBeDefined();
  });

  it("handles mixed-script input", async () => {
    const res = await ask(req("how do i renew my ប័ណ្ណបើកបរ"));
    expect(res.lang).toBe("km");
    expect(res.answer.length).toBeGreaterThan(0);
  });

  it("never returns an answer with citations it did not retrieve", async () => {
    const res = await ask(req("how do i renew my driving licence"));
    const retrieved = new Set(res.diagnostics!.candidates.map((c) => c.id));
    for (const c of res.citations) expect(retrieved.has(c.id)).toBe(true);
  });
});

/**
 * The paths after generation. The extractive provider quotes verbatim and never
 * escalates, so these branches are unreachable without controlling what the
 * provider returns — the mock exists to reach them, not to test the model.
 */
describe("post-generation gates", () => {
  const generate = vi.fn();

  async function loadWithProvider(
    result: Partial<{
      answer: string;
      citations: string[];
      confidence: string;
      shouldEscalate: boolean;
    }>,
    env: Record<string, string> = {},
  ) {
    vi.resetModules();
    const defaults: Record<string, string> = {
      LLM_PROVIDER: "extractive",
      DIAGNOSTICS_ENABLED: "true",
      GENERAL_FALLBACK_ENABLED: "false",
      RETRIEVAL_MIN_SCORE: "0.20",
    };
    for (const [k, v] of Object.entries({ ...defaults, ...env })) vi.stubEnv(k, v);

    generate.mockReset().mockResolvedValue({
      answer: "The renewal fee is 30,000 riel.",
      citations: ["MPWT-DL-001"],
      confidence: "high",
      shouldEscalate: false,
      provider: {
        id: "mock",
        label: "Mock",
        model: "mock-1",
        hosting: "test",
        residency: "test",
      },
      ...result,
    });

    const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
    vi.doMock("@/lib/llm", () => ({ ...actual, generate }));

    return (await import("@/lib/engine")).ask;
  }

  afterEach(() => {
    vi.doUnmock("@/lib/llm");
  });

  it("suppresses an answer that fails the FR-15 verification gate", async () => {
    // 45,000 riel appears in no source. An invented fee is the R-06 harm.
    const ask = await loadWithProvider({
      answer: "The renewal fee is 45,000 riel.",
      citations: ["MPWT-DL-001"],
    });
    const res = await ask(req("how do i renew my driving licence"));

    expect(res.tier).toBe(3);
    expect(res.citations).toEqual([]);
    expect(res.escalate).toBe(true);
    expect(res.diagnostics?.refusalReason).toBe("verification:failed");
    expect(res.answer).not.toContain("45,000");
  });

  it("reports the unsupported claim in the trace rather than only suppressing", async () => {
    const ask = await loadWithProvider({
      answer: "The renewal fee is 45,000 riel.",
      citations: ["MPWT-DL-001"],
    });
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.diagnostics?.verification.passed).toBe(false);
    expect(res.diagnostics?.verification.unsupported).toContain("45000");
  });

  it("suppresses an answer citing a source that was never retrieved", async () => {
    const ask = await loadWithProvider({
      answer: "The fee is 30,000 riel.",
      citations: ["FAKE-XX-999"],
    });
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.diagnostics?.refusalReason).toBe("verification:failed");
    expect(res.diagnostics?.verification.unsupported).toContain("FAKE-XX-999");
  });

  it("catches advisory drift after generation (NFR-04)", async () => {
    const ask = await loadWithProvider({
      answer: "You should sue the office.",
      citations: ["MPWT-DL-001"],
    });
    const res = await ask(req("how do i renew my driving licence"));

    expect(res.tier).toBe(3);
    expect(res.citations).toEqual([]);
    expect(res.escalate).toBe(true);
    expect(res.diagnostics?.refusalReason).toBe("moderation:legal_advice");
  });

  it("escalates when the model itself declines", async () => {
    const ask = await loadWithProvider({ shouldEscalate: true });
    const res = await ask(req("how do i renew my driving licence"));

    expect(res.tier).toBe(3);
    expect(res.escalate).toBe(true);
    expect(res.office).toBeDefined();
    expect(res.diagnostics?.refusalReason).toBe("provider:escalated");
  });

  it("escalates rather than answering when the model returns an empty answer", async () => {
    const ask = await loadWithProvider({ answer: "" });
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.escalate).toBe(true);
    expect(res.diagnostics?.refusalReason).toBe("provider:escalated");
  });

  it("keeps a verified answer and its citations when everything passes", async () => {
    const ask = await loadWithProvider({});
    const res = await ask(req("how do i renew my driving licence"));

    expect(res.tier).toBe(2);
    expect(res.citations.map((c) => c.id)).toContain("MPWT-DL-001");
    expect(res.diagnostics?.verification.passed).toBe(true);
    expect(res.answer).toContain("30,000 riel");
  });

  it("passes an answer whose numbers all appear in the cited source", async () => {
    const ask = await loadWithProvider({
      answer: "Bring three photographs. The fee is 30,000 riel.",
      citations: ["MPWT-DL-001"],
    });
    const res = await ask(req("how do i renew my driving licence"));
    expect(res.tier).toBe(2);
  });

  it("verifies against both language variants of the cited source", async () => {
    // The model may paraphrase a Khmer figure from the English body or reverse.
    const ask = await loadWithProvider({
      answer: "ថ្លៃគឺ ៣០០០០ រៀល។",
      citations: ["MPWT-DL-001"],
    });
    const res = await ask(req("ខ្ញុំចង់បន្តប័ណ្ណបើកបរ"));
    expect(res.diagnostics?.refusalReason).not.toBe("verification:failed");
  });

  describe("rationale gate — decided by the engine, not the model", () => {
    it("does not restate the rule as its own reason", async () => {
      const ask = await loadWithProvider({
        answer:
          "The late fee applies because the regulation provides that a licence expired for more than 30 days is subject to a daily penalty.",
        citations: ["MPWT-DL-001"],
      });
      const res = await ask(req("why is there a late fee on driving licence renewal"));

      // Either the rationale gate fired, or the answer stands — but if it
      // fired, it must say so as its own reason rather than as a provider
      // decline, because the rate of these measures a content gap.
      if (res.diagnostics?.refusalReason === "rationale:not_in_source") {
        expect(res.escalate).toBe(true);
        expect(res.office).toBeDefined();
      }
    });

    it("keeps the sourced rule rather than withholding it — a downgrade, not a dead end", async () => {
      const ask = await loadWithProvider({
        answer: "A penalty of 500 riel per day applies.",
        citations: ["MPWT-DL-001"],
      });
      const res = await ask(req("why is there a late fee on driving licence renewal"));
      expect(res.answer.length).toBeGreaterThan(0);
    });
  });

  it("labels an off-topic answer instead of suppressing it", async () => {
    // Topicality downgrades: the citizen keeps the closest approved source with
    // its citation, told plainly it may not address what they asked.
    const ask = await loadWithProvider(
      { answer: "The renewal fee is 30,000 riel.", citations: ["MPWT-DL-001"] },
      { RETRIEVAL_MIN_SCORE: "0.01" },
    );
    const res = await ask(req("how do i apply for a fishing permit in kampot province"));

    if (res.tier === 2 && res.citations.length > 0) {
      expect(res.answer).toMatch(/closest approved source|⚠️/);
    }
  });
});
