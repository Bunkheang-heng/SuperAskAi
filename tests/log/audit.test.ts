import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redact } from "@/lib/log/audit";

/**
 * FR-56 requires PII to be redacted BEFORE storage, not on read. Redaction on
 * read is not redaction — the raw value has already reached disk and every
 * backup of it. These tests therefore assert on `redact` directly, and on the
 * writers calling it, rather than on what a reader renders.
 */

describe("redact (FR-56)", () => {
  it("masks an email address", () => {
    expect(redact("contact me at sok.dara@example.com")).toBe(
      "contact me at [EMAIL]",
    );
  });

  it("masks a Cambodian national ID", () => {
    expect(redact("my id is 012345678")).toBe("my id is [ID]");
  });

  it("masks a passport number", () => {
    expect(redact("passport N1234567 expired")).toBe("passport [PASSPORT] expired");
  });

  it.each([
    "+855 12 345 678",
    "012 345 678",
    "+855-12-345-678",
  ])("masks a phone number: %s", (phone) => {
    expect(redact(`call me on ${phone}`)).not.toContain("345");
  });

  it("masks a long digit run", () => {
    expect(redact("account 12345678901234")).toBe("account [NUMBER]");
  });

  it("masks a full date of birth", () => {
    expect(redact("born 12/03/1990")).toBe("born [DATE]");
  });

  it("leaves a fee figure intact — redacting it would destroy the audit trail", () => {
    // FR-55 requires enough to reconstruct WHY an answer was produced. A fee is
    // the claim under review, not personal data.
    expect(redact("the fee is 30,000 riel")).toContain("30,000");
  });

  it("leaves a day count intact", () => {
    expect(redact("within 30 days of the birth")).toContain("30 days");
  });

  it("leaves emergency numbers intact", () => {
    expect(redact("Police 117 Ambulance 119")).toContain("117");
  });

  it("masks several distinct identifiers in one string", () => {
    const out = redact("i am sok.dara@example.com, id 012345678, phone 012 345 678");
    expect(out).toContain("[EMAIL]");
    expect(out).toContain("[ID]");
    expect(out).not.toContain("sok.dara");
  });

  it("does not partly mask a phone number inside a longer identifier", () => {
    // Ordering is most-specific-first for exactly this reason: a half-masked
    // value is still readable.
    const out = redact("ref 12345678901234567");
    expect(out).toBe("ref [NUMBER]");
  });

  it("is idempotent — redacting an already-redacted string changes nothing", () => {
    const once = redact("email sok@example.com id 012345678");
    expect(redact(once)).toBe(once);
  });

  it("handles empty input", () => {
    expect(redact("")).toBe("");
  });

  it("leaves an ordinary question untouched", () => {
    const q = "how do i renew my driving licence";
    expect(redact(q)).toBe(q);
  });
});

describe("audit writers redact before storage", () => {
  // Typed explicitly — an untyped vi.fn() infers a zero-argument signature and
  // the mock.calls[0][1] assertion below then fails to compile under `strict`.
  const appendFile =
    vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();

  beforeEach(() => {
    vi.resetModules();
    appendFile.mockReset().mockResolvedValue(undefined);
    vi.doMock("node:fs/promises", () => ({
      appendFile,
      mkdir: vi.fn(async () => {}),
    }));
  });

  afterEach(() => {
    vi.doUnmock("node:fs/promises");
  });

  /** The JSON payload of the single line written. */
  async function writtenRecord() {
    expect(appendFile).toHaveBeenCalledTimes(1);
    const line = appendFile.mock.calls[0][1];
    return JSON.parse(line.trim());
  }

  it("recordAnswer redacts both the question and the answer", async () => {
    const { recordAnswer } = await import("@/lib/log/audit");
    await recordAnswer("my id is 012345678", {
      id: "a1",
      tier: 2,
      lang: "en",
      answer: "We cannot look up 012345678.",
      citations: [],
      escalate: true,
    });

    const record = await writtenRecord();
    expect(record.question).toBe("my id is [ID]");
    expect(record.answer).toBe("We cannot look up [ID].");
  });

  it("recordAnswer captures the FR-55 reconstruction fields", async () => {
    const { recordAnswer } = await import("@/lib/log/audit");
    await recordAnswer("what is the fee", {
      id: "a2",
      tier: 2,
      lang: "en",
      answer: "The fee is 30,000 riel.",
      citations: [{ id: "MPWT-DL-001" } as never],
      escalate: false,
      diagnostics: {
        tier: 2,
        provider: "gateway",
        model: "openai/gpt-5.6-terra-pro",
        hosting: "gateway",
        residency: "unknown",
        promptVersion: "v3",
        detectedLang: "en",
        normalisedQuery: "what is the fee",
        segments: [],
        expandedTerms: [],
        candidates: [{ id: "MPWT-DL-001", lexical: 1, dense: 1, fused: 1, rerank: 1, cited: true }],
        confidence: "high",
        verification: { passed: true, unsupported: [] },
        latencyMs: 8919,
      } as never,
    });

    const record = await writtenRecord();
    expect(record).toMatchObject({
      id: "a2",
      provider: "gateway",
      model: "openai/gpt-5.6-terra-pro",
      promptVersion: "v3",
      retrievedIds: ["MPWT-DL-001"],
      citedIds: ["MPWT-DL-001"],
      verificationPassed: true,
      latencyMs: 8919,
    });
  });

  it("recordAnswer records `unverified` separately from an empty citation list", async () => {
    // A refusal also has no citations. A reviewer asking what SuperAsk has told
    // citizens without a source must be able to filter on exactly this.
    const { recordAnswer } = await import("@/lib/log/audit");
    await recordAnswer("what is the rule", {
      id: "a3",
      tier: 2,
      lang: "en",
      answer: "Unsourced answer.",
      citations: [],
      escalate: false,
      unverified: true,
    });

    expect((await writtenRecord()).unverified).toBe(true);
  });

  it("recordFeedback redacts the free-text comment", async () => {
    const { recordFeedback } = await import("@/lib/log/audit");
    await recordFeedback({
      answerId: "a1",
      kind: "incorrect",
      comment: "wrong — call me on 012 345 678",
      citedIds: ["MPWT-DL-001"],
      ministries: ["MPWT"],
    });

    expect((await writtenRecord()).comment).not.toContain("345 678");
  });

  it("recordEscalation redacts every transcript turn (FR-28)", async () => {
    const { recordEscalation } = await import("@/lib/log/audit");
    await recordEscalation({
      ref: "REF-1",
      answerId: "a1",
      lang: "en",
      transcript: [
        { role: "user", text: "my id is 012345678" },
        { role: "assistant", text: "Contact sok@example.com" },
      ],
      citedIds: [],
      ministries: [],
    });

    const record = await writtenRecord();
    expect(record.transcript[0].text).toBe("my id is [ID]");
    expect(record.transcript[1].text).toBe("Contact [EMAIL]");
  });

  it("does not throw when the disk write fails — an audit failure must not fail the citizen's request", async () => {
    appendFile.mockRejectedValueOnce(new Error("ENOSPC"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { recordAnswer } = await import("@/lib/log/audit");
    await expect(
      recordAnswer("q", {
        id: "a1",
        tier: 3,
        lang: "en",
        answer: "a",
        citations: [],
        escalate: true,
      }),
    ).resolves.toBeUndefined();

    // ...but it must not pass silently either.
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
