import { describe, it, expect } from "vitest";
import {
  systemPromptFor,
  promptVersionFor,
  jsonContractFor,
  buildUserContent,
  parseGeneration,
  PROMPT_VERSION,
  GENERAL_PROMPT_VERSION,
  GROUNDING_PROMPT,
  GENERAL_KNOWLEDGE_PROMPT,
} from "@/lib/llm/provider";
import type { GenerationRequest } from "@/lib/llm/provider";

/**
 * The prompt contract. `grounded` and `general` are different contracts, not a
 * strictness dial — FR-55 logs the prompt version against every answer, and an
 * auditor has to be able to tell from that field alone whether an answer was
 * source-grounded.
 */

const SOURCE = {
  id: "MPWT-DL-001",
  header: "Ministry of Public Works and Transport — Driver's Licence",
  text: "The renewal fee is 30,000 riel.",
  textKm: "ថ្លៃបន្តគឺ ៣០០០០ រៀល។",
};

function request(over: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    question: "how do i renew my driving licence",
    lang: "en",
    sources: [SOURCE],
    ...over,
  } as GenerationRequest;
}

describe("prompt selection", () => {
  it("uses the grounding prompt by default", () => {
    expect(systemPromptFor(request())).toBe(GROUNDING_PROMPT);
    expect(systemPromptFor(request({ mode: "grounded" }))).toBe(GROUNDING_PROMPT);
  });

  it("uses the general-knowledge prompt in general mode", () => {
    expect(systemPromptFor(request({ mode: "general" }))).toBe(
      GENERAL_KNOWLEDGE_PROMPT,
    );
  });

  it("versions the two contracts separately (FR-55)", () => {
    expect(promptVersionFor(undefined)).toBe(PROMPT_VERSION);
    expect(promptVersionFor("grounded")).toBe(PROMPT_VERSION);
    expect(promptVersionFor("general")).toBe(GENERAL_PROMPT_VERSION);
    expect(PROMPT_VERSION).not.toBe(GENERAL_PROMPT_VERSION);
  });

  it("gives each mode its own JSON contract instruction", () => {
    expect(jsonContractFor(request({ mode: "general" }))).not.toBe(
      jsonContractFor(request({ mode: "grounded" })),
    );
  });

  it("identifies AskGov as a government service in both prompts", () => {
    for (const prompt of [GROUNDING_PROMPT, GENERAL_KNOWLEDGE_PROMPT]) {
      expect(prompt).toMatch(/You are AskGov/);
      expect(prompt).toMatch(/Royal Government of Cambodia/i);
    }
  });
});

describe("buildUserContent — grounded mode", () => {
  it("states the reply language first (FR-08)", () => {
    expect(buildUserContent(request({ lang: "km" })).startsWith("REPLY_LANGUAGE: km")).toBe(
      true,
    );
  });

  it("labels each source with its id, so a citation can be checked against it", () => {
    expect(buildUserContent(request())).toContain("[MPWT-DL-001]");
  });

  it("includes the source header and body", () => {
    const content = buildUserContent(request());
    expect(content).toContain(SOURCE.header);
    expect(content).toContain(SOURCE.text);
  });

  it("labels the Khmer text as the same provision, so official terminology can be lifted", () => {
    // Unlabelled, the model translates the English itself, which is where
    // plausible but unofficial-sounding wording comes from.
    const content = buildUserContent(request());
    expect(content).toContain("Khmer text of the same provision");
    expect(content).toContain(SOURCE.textKm);
  });

  it("omits the Khmer block when the source has none", () => {
    const content = buildUserContent(
      request({ sources: [{ ...SOURCE, textKm: undefined }] }),
    );
    expect(content).not.toContain("Khmer text of the same provision");
  });

  it("carries every source when several are retrieved", () => {
    const second = { ...SOURCE, id: "MPWT-DL-002", text: "A late penalty applies." };
    const content = buildUserContent(request({ sources: [SOURCE, second] }));
    expect(content).toContain("[MPWT-DL-001]");
    expect(content).toContain("[MPWT-DL-002]");
  });

  it("says so explicitly when nothing was retrieved", () => {
    expect(buildUserContent(request({ sources: [] }))).toContain("(no sources retrieved)");
  });

  it("puts the citizen question last, after the sources", () => {
    const content = buildUserContent(request());
    expect(content.indexOf("SOURCES:")).toBeLessThan(content.indexOf("CITIZEN QUESTION:"));
    expect(content.trim().endsWith("how do i renew my driving licence")).toBe(true);
  });
});

describe("buildUserContent — general mode", () => {
  it("omits the SOURCES block entirely rather than sending an empty one", () => {
    // An empty block invites the model to treat the absence as an oversight and
    // cite something anyway.
    const content = buildUserContent(request({ mode: "general", sources: [] }));
    expect(content).not.toContain("SOURCES:");
    expect(content).not.toContain("(no sources retrieved)");
  });

  it("states the situation plainly, which is what the general prompt is written against", () => {
    const content = buildUserContent(request({ mode: "general", sources: [] }));
    expect(content).toContain("NO APPROVED SOURCE COVERS THIS QUESTION");
  });

  it("still states the reply language", () => {
    const content = buildUserContent(request({ mode: "general", sources: [], lang: "km" }));
    expect(content.startsWith("REPLY_LANGUAGE: km")).toBe(true);
  });
});

describe("parseGeneration", () => {
  const ok = JSON.stringify({
    answer: "The renewal fee is 30,000 riel.",
    citations: ["MPWT-DL-001"],
    confidence: "high",
    should_escalate: false,
  });

  it("parses clean JSON", () => {
    expect(parseGeneration(ok)).toEqual({
      answer: "The renewal fee is 30,000 riel.",
      citations: ["MPWT-DL-001"],
      confidence: "high",
      shouldEscalate: false,
    });
  });

  it("tolerates code fences", () => {
    expect(parseGeneration("```json\n" + ok + "\n```").answer).toContain("30,000 riel");
  });

  it("tolerates a leading preamble", () => {
    expect(parseGeneration("Here is the answer:\n" + ok).answer).toContain("30,000 riel");
  });

  it("takes the outermost object, so nested braces survive", () => {
    const nested = JSON.stringify({
      answer: "See {the annex} for details.",
      citations: ["MPWT-DL-001"],
    });
    expect(parseGeneration(nested).answer).toBe("See {the annex} for details.");
  });

  it("throws rather than fabricating when the output is not JSON", () => {
    expect(() => parseGeneration("I could not answer that.")).toThrow(/not valid JSON/i);
  });

  it("throws when there is no answer field", () => {
    expect(() => parseGeneration(JSON.stringify({ citations: [] }))).toThrow(
      /no answer field/i,
    );
  });

  it("throws on an empty or whitespace-only answer", () => {
    expect(() => parseGeneration(JSON.stringify({ answer: "   " }))).toThrow(
      /no answer field/i,
    );
  });

  it("drops non-string entries from citations", () => {
    const res = parseGeneration(
      JSON.stringify({ answer: "a", citations: ["MPWT-DL-001", 42, null] }),
    );
    expect(res.citations).toEqual(["MPWT-DL-001"]);
  });

  it("defaults an unrecognised confidence to low", () => {
    expect(parseGeneration(JSON.stringify({ answer: "a", citations: ["x"], confidence: "certain" })).confidence).toBe("low");
  });

  describe("grounded mode — rule 4", () => {
    it("escalates an answer that rests on nothing, whatever the model claimed", () => {
      const res = parseGeneration(
        JSON.stringify({ answer: "a", citations: [], should_escalate: false }),
      );
      expect(res.shouldEscalate).toBe(true);
    });

    it("escalates when the model asks to, even with citations", () => {
      const res = parseGeneration(
        JSON.stringify({ answer: "a", citations: ["x"], should_escalate: true }),
      );
      expect(res.shouldEscalate).toBe(true);
    });
  });

  describe("general mode", () => {
    it("discards any citation the model produced — there were no sources to cite", () => {
      const res = parseGeneration(
        JSON.stringify({ answer: "a", citations: ["MPWT-DL-001"] }),
        "general",
      );
      expect(res.citations).toEqual([]);
    });

    it("caps confidence at medium without a source behind it", () => {
      const res = parseGeneration(
        JSON.stringify({ answer: "a", confidence: "high" }),
        "general",
      );
      expect(res.confidence).toBe("medium");
    });

    it("does not escalate on empty citations — that is the expected state here", () => {
      const res = parseGeneration(
        JSON.stringify({ answer: "a", citations: [], should_escalate: false }),
        "general",
      );
      expect(res.shouldEscalate).toBe(false);
    });

    it("still honours the model's own decline", () => {
      const res = parseGeneration(
        JSON.stringify({ answer: "a", should_escalate: true }),
        "general",
      );
      expect(res.shouldEscalate).toBe(true);
    });
  });
});
