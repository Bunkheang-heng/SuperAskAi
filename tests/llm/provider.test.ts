import { describe, it, expect, vi, afterEach } from "vitest";
import { createExtractiveProvider } from "@/lib/llm/extractive";
import type { GenerationRequest } from "@/lib/llm/provider";

/**
 * NFR-18 / BR-009: no component outside lib/llm/ contains model-specific logic,
 * and credentials live only in this layer. NFR-09: where model services are
 * unavailable the system degrades to escalation, never to failure.
 */

/** The source block shape tiers.ts assembles: id, header, and both variants. */
const SOURCE: GenerationRequest["sources"][number] = {
  id: "MPWT-DL-001",
  header:
    "Ministry of Public Works and Transport — Driver's Licence, Prakas No. 047 SK, Not cited on source page (effective 2017-01-27, verified 2026-07-31)",
  text: "To renew a driving licence, bring the old licence and an identity card. The fee is 30,000 riel.",
  textKm: "ដើម្បីបន្តប័ណ្ណបើកបរ ត្រូវយកប័ណ្ណចាស់ និងអត្តសញ្ញាណប័ណ្ណ។",
};

function request(over: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    question: "how do i renew my driving licence",
    lang: "en",
    sources: [SOURCE],
    ...over,
  } as GenerationRequest;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("extractive provider", () => {
  const provider = createExtractiveProvider();

  it("reports itself as in-process and domestically resident", () => {
    expect(provider.info).toMatchObject({
      id: "extractive",
      hosting: "In-process",
      residency: "Cambodia",
    });
  });

  it("quotes the source verbatim — it cannot hallucinate because it copies", async () => {
    const res = await provider.generate(request());
    expect(res.answer).toContain(SOURCE.text);
  });

  it("cites the source it quoted", async () => {
    const res = await provider.generate(request());
    expect(res.citations).toEqual(["MPWT-DL-001"]);
  });

  it("never claims better than medium confidence", async () => {
    // A verbatim provision may be the right provision without being a direct
    // answer to what was asked.
    const res = await provider.generate(request());
    expect(res.confidence).toBe("medium");
  });

  it("quotes only the top-ranked provision, not a wall of concatenated text", async () => {
    const second = { ...SOURCE, id: "MPWT-DL-002", text: "A late penalty applies." };
    const res = await provider.generate(request({ sources: [SOURCE, second] }));
    expect(res.citations).toEqual(["MPWT-DL-001"]);
    expect(res.answer).not.toContain("A late penalty applies.");
  });

  it("quotes the Khmer text to a Khmer speaker (FR-08)", async () => {
    const res = await provider.generate(request({ lang: "km" }));
    expect(res.answer).toContain(SOURCE.textKm);
    expect(res.answer).not.toContain(SOURCE.text);
  });

  it("warns only when the source genuinely has no Khmer version", async () => {
    const withKm = await provider.generate(request({ lang: "km" }));
    expect(withKm.answer).not.toMatch(/ភាសាអង់គ្លេសតែប៉ុណ្ណោះ/);

    const noKm = await provider.generate(
      request({ lang: "km", sources: [{ ...SOURCE, textKm: undefined }] }),
    );
    expect(noKm.answer).toMatch(/ភាសាអង់គ្លេសតែប៉ុណ្ណោះ/);
  });

  it("treats an empty textKm as no Khmer version", async () => {
    const res = await provider.generate(
      request({ lang: "km", sources: [{ ...SOURCE, textKm: "   " }] }),
    );
    expect(res.answer).toMatch(/ភាសាអង់គ្លេសតែប៉ុណ្ណោះ/);
  });

  it("escalates with no citation when there are no sources", async () => {
    const res = await provider.generate(request({ sources: [] }));
    expect(res.shouldEscalate).toBe(true);
    expect(res.citations).toEqual([]);
    expect(res.confidence).toBe("low");
  });

  it("escalates in general mode too — no model means no general knowledge", async () => {
    // The correct degradation, not a gap: the general fallback is a model
    // capability, and where there is no model there is no fallback.
    const res = await provider.generate(request({ sources: [], mode: "general" }));
    expect(res.shouldEscalate).toBe(true);
    expect(res.citations).toEqual([]);
  });

  it("carries the degradation reason when constructed with one (NFR-09)", () => {
    const degraded = createExtractiveProvider("Gateway unavailable.");
    expect(degraded.info.note).toBe("Gateway unavailable.");
  });

  it("says no model is configured by default", () => {
    expect(provider.info.note).toMatch(/no model provider configured/i);
  });
});

describe("provider selection", () => {
  async function load() {
    vi.resetModules();
    return import("@/lib/llm");
  }

  it("defaults to the extractive provider with nothing configured", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    const { describeProvider } = await load();
    expect(describeProvider().id).toBe("extractive");
  });

  it.each(["extractive", "EXTRACTIVE", "Extractive"])(
    "is case-insensitive about the provider name: %s",
    async (value) => {
      vi.stubEnv("LLM_PROVIDER", value);
      const { describeProvider } = await load();
      expect(describeProvider().id).toBe("extractive");
    },
  );

  it("falls back to extractive rather than throwing on an unknown provider", async () => {
    vi.stubEnv("LLM_PROVIDER", "not-a-provider");
    const { describeProvider } = await load();
    expect(describeProvider().id).toBe("extractive");
  });

  it("never exposes a credential in the provider metadata (FR-74, R-15)", async () => {
    vi.stubEnv("LLM_PROVIDER", "gateway");
    vi.stubEnv("LLM_GATEWAY_API_KEY", "sk-nous-should-never-appear");
    vi.stubEnv("LLM_GATEWAY_BASE_URL", "https://example.invalid/v1");
    const { describeProvider } = await load();

    const serialised = JSON.stringify(describeProvider());
    expect(serialised).not.toContain("sk-nous");
    expect(serialised).not.toMatch(/api[_-]?key/i);
  });

  it.each(["sealion", "SEA-LION", "sea-lion"])(
    "selects SEA-LION when LLM_PROVIDER=%s",
    async (value) => {
      vi.stubEnv("LLM_PROVIDER", value);
      vi.stubEnv("SEALION_API_KEY", "sk-sealion-should-never-appear");
      const { describeProvider } = await load();
      expect(describeProvider().id).toBe("sealion");
    },
  );
});

describe("generate — NFR-09 degradation", () => {
  async function load() {
    vi.resetModules();
    return import("@/lib/llm");
  }

  it("degrades to extraction rather than failing when the provider is misconfigured", async () => {
    vi.stubEnv("LLM_PROVIDER", "not-a-provider");
    const { generate } = await load();
    const out = await generate(request());

    expect(out.provider.id).toBe("extractive");
    expect(out.fallbackReason).toBeTruthy();
    expect(out.answer).toContain(SOURCE.text);
  });

  it("records what actually happened, so the failure is visible to operators", async () => {
    vi.stubEnv("LLM_PROVIDER", "not-a-provider");
    const { generate } = await load();
    const out = await generate(request());
    expect(out.fallbackReason).toMatch(/not-a-provider/i);
  });

  it("still gives the citizen the provision and an offer of an officer", async () => {
    vi.stubEnv("LLM_PROVIDER", "not-a-provider");
    const { generate } = await load();

    const withSource = await generate(request());
    expect(withSource.citations).toEqual(["MPWT-DL-001"]);

    const without = await generate(request({ sources: [] }));
    expect(without.shouldEscalate).toBe(true);
  });

  it("reports the extractive provider's own info after a degradation, not the failed one's", async () => {
    vi.stubEnv("LLM_PROVIDER", "not-a-provider");
    const { generate } = await load();
    const out = await generate(request());
    expect(out.provider.hosting).toBe("In-process");
    expect(out.provider.residency).toBe("Cambodia");
  });

  it("sets no fallbackReason on a clean run", async () => {
    vi.stubEnv("LLM_PROVIDER", "extractive");
    const { generate } = await load();
    const out = await generate(request());
    expect(out.fallbackReason).toBeUndefined();
  });
});

describe("prompt versioning (FR-55)", () => {
  it("exposes distinct versions for the grounded and general contracts", async () => {
    const { PROMPT_VERSION, GENERAL_PROMPT_VERSION } = await import("@/lib/llm");
    // An auditor must be able to tell from the logged version alone whether an
    // answer was source-grounded.
    expect(PROMPT_VERSION).toBeTruthy();
    expect(GENERAL_PROMPT_VERSION).toBeTruthy();
    expect(PROMPT_VERSION).not.toBe(GENERAL_PROMPT_VERSION);
  });
});
