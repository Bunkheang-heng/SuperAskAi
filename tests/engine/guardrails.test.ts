import { describe, it, expect } from "vitest";
import {
  screen,
  isOffDomain,
  isOffTopicTurn,
  inScopeHistory,
  looksLikeServiceQuestion,
  moderateOutput,
} from "@/lib/engine/guardrails";

/**
 * The refusal policy is a governance document (§12 preamble, OD-07). These
 * tests are the executable form of it: a change to what AskGov refuses should
 * fail here first and be reviewed as policy, not discovered in production.
 */

describe("screen — refusal policy (§12)", () => {
  describe("rule 6: emergency", () => {
    it.each([
      "there is a fire in my house",
      "my father is unconscious what do i do",
      "someone is bleeding help me now",
      "i want to kill myself",
      "call the police",
      "he had a heart attack",
    ])("refuses and terminates: %s", (q) => {
      const hit = screen(q);
      expect(hit?.kind).toBe("emergency");
      expect(hit?.terminal).toBe(true);
    });

    it("refuses Khmer emergency phrasing (FR-08)", () => {
      const hit = screen("ជួយផង អាសន្ន");
      expect(hit?.kind).toBe("emergency");
      expect(hit?.terminal).toBe(true);
    });

    it("carries the emergency numbers in both languages", () => {
      const hit = screen("there is a fire");
      expect(hit?.message.en).toContain("117");
      expect(hit?.message.en).toContain("119");
      expect(hit?.message.en).toContain("118");
      expect(hit?.message.km).toContain("១១៧");
    });

    it("wins over a procedural framing — an emergency asked as a procedure is still an emergency", () => {
      // Contains "certificate" and "how do i apply", both strong service
      // signals. Rule 6 is checked first for exactly this reason.
      const hit = screen("how do i apply for a death certificate, my wife is bleeding");
      expect(hit?.kind).toBe("emergency");
      expect(hit?.terminal).toBe(true);
    });
  });

  describe("personal case lookup (§6.2)", () => {
    it.each([
      "has my licence application been approved yet",
      "where is my passport",
      "what is my licence number",
      "look up my records",
      "check the status of my application",
    ])("refuses without terminating: %s", (q) => {
      const hit = screen(q);
      expect(hit?.kind).toBe("personal_case");
      expect(hit?.terminal).toBe(false);
    });

    it("says it cannot verify identity, not merely that it lacks the data", () => {
      const hit = screen("where is my passport");
      expect(hit?.message.en).toMatch(/verify who you are/i);
    });
  });

  describe("legal advice (rule 5, §6.2)", () => {
    it.each([
      "is it legal to drive without insurance",
      "can i sue the office",
      "do i need a lawyer",
      "will i be fined for this",
      "am i allowed to build here",
    ])("refuses: %s", (q) => {
      expect(screen(q)?.kind).toBe("legal_advice");
    });

    it("offers procedure instead of position", () => {
      expect(screen("can i sue them")?.message.en).toMatch(/procedures, not legal position/i);
    });
  });

  describe("prediction of official decisions (§6.2)", () => {
    it.each([
      "will they approve my application",
      "what are my chances",
      "do you think they will accept it",
    ])("refuses: %s", (q) => {
      expect(screen(q)?.kind).toBe("prediction");
    });
  });

  describe("land disputes (§6.2)", () => {
    it.each([
      "i have a land dispute with my neighbour",
      "who owns the land next to mine",
      "there is a boundary dispute",
    ])("refuses: %s", (q) => {
      expect(screen(q)?.kind).toBe("land_dispute");
    });
  });

  describe("tax computation (§6.2)", () => {
    it.each([
      "how much tax do i owe",
      "calculate my tax",
      "what is my tax liability",
    ])("refuses: %s", (q) => {
      expect(screen(q)?.kind).toBe("tax_computation");
    });

    it("explains the financial-consequence reason, not a capability limit", () => {
      expect(screen("calculate my tax")?.message.en).toMatch(/financial consequences/i);
    });
  });

  describe("political comment (rule 7)", () => {
    it.each([
      "who should i vote for",
      "which party is best",
      "is the government corrupt",
      "what do you think of the minister",
    ])("refuses: %s", (q) => {
      expect(screen(q)?.kind).toBe("political");
    });
  });

  describe("complaint routing (NG-03)", () => {
    it.each([
      "i want to file a complaint",
      "i want to report an officer",
      "this officer demanded money from me",
    ])("refuses: %s", (q) => {
      expect(screen(q)?.kind).toBe("complaint_routing");
    });

    it("still offers to say WHERE a complaint is lodged — in scope per §6.1", () => {
      const hit = screen("i want to file a complaint");
      expect(hit?.message.en).toMatch(/where complaints .* are lodged/i);
    });
  });

  describe("questions the policy must NOT refuse", () => {
    it.each([
      "how do i renew my driving licence",
      "what documents do i need for a birth certificate",
      "what is the fee for vehicle registration",
      "where do i register a company",
      "my child's birth was never registered, what now",
      "how long does a passport take",
    ])("passes through: %s", (q) => {
      expect(screen(q)).toBeNull();
    });
  });

  it("returns a message in both languages for every rule that fires", () => {
    const probes = [
      "there is a fire",
      "where is my passport",
      "can i sue",
      "will they approve it",
      "land dispute with neighbour",
      "calculate my tax",
      "who should i vote for",
      "i want to file a complaint",
    ];
    for (const q of probes) {
      const hit = screen(q);
      expect(hit, q).not.toBeNull();
      expect(hit!.message.en.length).toBeGreaterThan(0);
      expect(hit!.message.km.length).toBeGreaterThan(0);
    }
  });
});

describe("looksLikeServiceQuestion — positive scope gate", () => {
  it.each([
    "how do i renew my passport",
    "what is the fee for a birth certificate",
    "where do i register my company",
    "which office handles vehicle inspection",
    "what documents do i need",
    "how much does it cost to apply for a permit",
  ])("accepts English service vocabulary: %s", (q) => {
    expect(looksLikeServiceQuestion(q)).toBe(true);
  });

  it.each([
    "ខ្ញុំចង់បន្តប័ណ្ណបើកបរ",
    "សំបុត្រកំណើតត្រូវការឯកសារអ្វីខ្លះ",
    "ហេតុអ្វីបានជាមានការពិន័យយឺតយ៉ាវ",
  ])("accepts Khmer service vocabulary (FR-08): %s", (q) => {
    expect(looksLikeServiceQuestion(q)).toBe(true);
  });

  it("accepts the penalty cluster in Khmer — the drift bug the docstring names", () => {
    // SERVICE_TERMS carries penalty/fine/late; SERVICE_TERMS_KM once did not,
    // so this exact question was refused while its English twin was answered.
    expect(looksLikeServiceQuestion("ហេតុអ្វីបានជាមានការពិន័យយឺតយ៉ាវ")).toBe(true);
    expect(looksLikeServiceQuestion("why is there a late penalty")).toBe(true);
  });

  it("accepts romanised Khmer service words", () => {
    expect(looksLikeServiceQuestion("sombot kamnaot trauv ke ekasa avei khlah")).toBe(
      true,
    );
  });

  it("accepts a glossary term, so definition questions survive the gate (§6.1)", () => {
    expect(looksLikeServiceQuestion("what does prakas mean")).toBe(true);
  });

  it.each([
    "tom holland from spider man",
    "i want to drink coffee, where should i go?",
    "what is the capital of france",
    "tell me a joke",
  ])("rejects non-service questions: %s", (q) => {
    expect(looksLikeServiceQuestion(q)).toBe(false);
  });
});

describe("isOffDomain", () => {
  it.each([
    "how do you say hello in khmer",
    "translate this for me",
    "what is the capital of france",
    "tell me a joke",
    "write me some code",
    "2 + 2 = ?",
  ])("refuses explicit off-domain requests: %s", (q) => {
    expect(isOffDomain(q)).toBe(true);
  });

  it("refuses the two leaks the positive gate was added for", () => {
    expect(isOffDomain("tom holland from spider man")).toBe(true);
    expect(isOffDomain("i want to drink coffee, where should i go?")).toBe(true);
  });

  it("keeps definition questions in scope — 'what does prakas mean' (§6.1)", () => {
    expect(isOffDomain("what does prakas mean")).toBe(false);
  });

  it.each([
    "how do i renew my driving licence",
    "what documents do i need for a birth certificate",
    "ខ្ញុំចង់បន្តប័ណ្ណបើកបរ",
  ])("keeps service questions in scope: %s", (q) => {
    expect(isOffDomain(q)).toBe(false);
  });

  describe("scope is a property of the conversation (FR-07)", () => {
    const history = [{ text: "how do i renew my driving licence" }];

    it("keeps a subject-less follow-up in scope when it leans on a prior turn", () => {
      expect(isOffDomain("where in phnom penh?", history)).toBe(false);
      expect(isOffDomain("and the fee?", history)).toBe(false);
    });

    it("refuses a subject-less question with no history to lean on", () => {
      expect(isOffDomain("where in phnom penh?", [])).toBe(true);
      expect(isOffDomain("can you give me the specific locations?", [])).toBe(true);
    });

    it("keeps a follow-up that names a service term in scope with no history at all", () => {
      // "and the fee?" is subject-less as a follow-up, but "fee" is itself a
      // service term — the positive gate accepts it on its own merit before
      // the history rule is ever reached. Worth pinning: it means the two
      // paths to in-scope are independent, and a term added to SERVICE_TERMS
      // silently widens what survives with no conversation behind it.
      expect(isOffDomain("and the fee?", [])).toBe(false);
    });

    it("judges a self-subjected question on its own subject however deep the conversation", () => {
      // Four content words of its own — it inherits nothing.
      expect(isOffDomain("tom holland from spider man", history)).toBe(true);
    });

    it("still refuses an explicit off-domain request mid-conversation", () => {
      expect(isOffDomain("tell me a joke", history)).toBe(true);
    });

    it("does not treat an off-domain first turn as a service anchor", () => {
      // The first turn was refused as not a service question. A later
      // subject-less follow-up is not "about" that turn — there is no service
      // topic to lean on — and must still be refused.
      expect(
        isOffDomain("where in phnom penh?", [{ text: "tell me a joke" }]),
      ).toBe(true);
      expect(
        isOffDomain("where in phnom penh?", [
          { text: "what is the capital of france" },
        ]),
      ).toBe(true);
    });
  });
});

describe("inScopeHistory — refused turns cannot rewrite the next question", () => {
  const refusal = {
    role: "assistant" as const,
    text: "AskGov only answers questions about Cambodian government service procedures",
  };

  it("drops a short celebrity question that was already refused", () => {
    // Two content words ("elon", "musk") used to look like a follow-up
    // refinement, so the turn survived filtering and was glued onto "how do
    // I get married?". First-turn scope already refuses it; history must too.
    expect(isOffTopicTurn("who is elon musk?")).toBe(true);
    expect(isOffTopicTurn("what is law")).toBe(true);
    expect(
      inScopeHistory([
        { role: "user", text: "who is elon musk?" },
        refusal,
        { role: "user", text: "what is law" },
        refusal,
      ]),
    ).toEqual([]);
  });

  it("keeps a subject-less follow-up after a real service question", () => {
    const kept = inScopeHistory([
      { role: "user", text: "how do i renew my driving licence" },
      { role: "assistant", text: "Bring your old licence and national ID card." },
      { role: "user", text: "where in phnom penh?" },
    ]);
    expect(kept.map((t) => t.text)).toEqual([
      "how do i renew my driving licence",
      "Bring your old licence and national ID card.",
      "where in phnom penh?",
    ]);
    expect(
      isOffTopicTurn("where in phnom penh?", [
        { role: "user", text: "how do i renew my driving licence" },
      ]),
    ).toBe(false);
  });

  it("drops an off-domain turn sitting in front of a later service question", () => {
    const kept = inScopeHistory([
      { role: "user", text: "who is elon musk?" },
      refusal,
      { role: "user", text: "how do I get married?" },
    ]);
    expect(kept.map((t) => t.text)).toEqual(["how do I get married?"]);
  });
});

describe("moderateOutput — NFR-04 output moderation", () => {
  it.each([
    "You should sue the office for this.",
    "I recommend you refuse to pay.",
    "You are legally entitled to a waiver.",
    "You will definitely get approved.",
  ])("catches advisory drift in a generated answer: %s", (answer) => {
    const hit = moderateOutput(answer);
    expect(hit?.kind).toBe("legal_advice");
    expect(hit?.terminal).toBe(false);
  });

  it("passes a normal sourced answer", () => {
    expect(
      moderateOutput(
        "You can renew your driving licence at listed MPWT service locations. The fee is 30,000 riel.",
      ),
    ).toBeNull();
  });

  it("passes an answer that merely mentions appeals", () => {
    expect(
      moderateOutput("If the application is refused, an appeal is lodged with the ministry."),
    ).toBeNull();
  });

  it("reuses the legal_advice message so the citizen sees one consistent policy", () => {
    const hit = moderateOutput("You should sue them.");
    expect(hit?.message.en).toBe(screen("can i sue")?.message.en);
  });
});
