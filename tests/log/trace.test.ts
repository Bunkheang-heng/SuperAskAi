import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Operator process log: every gate, the payload sent to the model, and the
 * model's reply. PII is redacted before anything is printed or written (FR-56).
 * Credentials never appear (FR-74, R-15).
 */

const appendFile =
  vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();

beforeEach(() => {
  vi.resetModules();
  appendFile.mockReset().mockResolvedValue(undefined);
  vi.doMock("node:fs/promises", () => ({
    appendFile,
    mkdir: vi.fn(async () => {}),
  }));
  vi.stubEnv("ASK_TRACE", "true");
  vi.stubEnv("LLM_PROVIDER", "extractive");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("node:fs/promises");
  vi.restoreAllMocks();
});

async function load() {
  return import("@/lib/log/trace");
}

describe("scrub", () => {
  it("redacts PII inside nested strings", async () => {
    const { scrub } = await load();
    expect(scrub({ question: "my id is 012345678" })).toEqual({
      question: "my id is [ID]",
    });
  });

  it("strips credentials even if a caller tries to log them (FR-74)", async () => {
    const { scrub } = await load();
    const out = scrub({
      Authorization: "Bearer sk-secret-value",
      apiKey: "sk-secret-value",
      headers: { authorization: "Bearer sk-secret-value" },
      body: "ok",
    }) as Record<string, unknown>;

    expect(JSON.stringify(out)).not.toContain("sk-secret");
    expect(out.body).toBe("ok");
  });
});

describe("trace", () => {
  it("does nothing when ASK_TRACE is not true", async () => {
    vi.stubEnv("ASK_TRACE", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { createTrace, runWithTrace, trace, flushTrace } = await load();

    await runWithTrace(createTrace("t1"), async () => {
      trace("received", { question: "how do i renew" });
      await flushTrace();
    });

    expect(log).not.toHaveBeenCalled();
    expect(appendFile).not.toHaveBeenCalled();
  });

  it("prints the step and the payload to the console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { createTrace, runWithTrace, trace } = await load();

    runWithTrace(createTrace("trace-id-1"), () => {
      trace("received", { question: "how do i renew my driving licence" });
    });

    const printed = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(printed).toMatch(/\[ask trace-id\]/);
    expect(printed).toMatch(/received/);
    expect(printed).toMatch(/how do i renew my driving licence/);
  });

  it("redacts PII before it reaches the console or the file (FR-56)", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { createTrace, runWithTrace, trace, flushTrace } = await load();

    await runWithTrace(createTrace("t2"), async () => {
      trace("received", { question: "email me at sok@example.com" });
      await flushTrace();
    });

    const printed = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(printed).not.toContain("sok@example.com");
    expect(printed).toContain("[EMAIL]");

    const line = appendFile.mock.calls[0][1];
    expect(line).not.toContain("sok@example.com");
    expect(line).toContain("[EMAIL]");
  });

  it("writes JSONL under var/trace.jsonl so the process can be tailed", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { createTrace, runWithTrace, trace, flushTrace } = await load();

    await runWithTrace(createTrace("t3"), async () => {
      trace("received", { question: "what is the fee" });
      trace("done", { tier: 2 });
      await flushTrace();
    });

    expect(appendFile).toHaveBeenCalledTimes(1);
    const [path, payload] = appendFile.mock.calls[0];
    expect(String(path)).toMatch(/var[/\\]trace\.jsonl$/);
    const lines = String(payload)
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines.map((l: { step: string }) => l.step)).toEqual([
      "received",
      "done",
    ]);
  });

  it("does not throw when the disk write fails", async () => {
    appendFile.mockRejectedValueOnce(new Error("ENOSPC"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { createTrace, runWithTrace, trace, flushTrace } = await load();

    await expect(
      runWithTrace(createTrace("t4"), async () => {
        trace("received", { question: "q" });
        await flushTrace();
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("generate — LLM I/O when tracing", () => {
  it("records what was sent to the model and what came back", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { createTrace, runWithTrace, flushTrace } = await load();
    const { generate } = await import("@/lib/llm");

    await runWithTrace(createTrace("t5"), async () => {
      await generate({
        question: "how do i renew my driving licence",
        lang: "en",
        history: [],
        sources: [
          {
            id: "MPWT-DL-001",
            header: "Driver's Licence",
            text: "The fee is 30,000 riel.",
          },
        ],
      });
      await flushTrace();
    });

    const events = String(appendFile.mock.calls[0][1])
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    const steps = events.map((e: { step: string }) => e.step);
    expect(steps).toContain("llm.request");
    expect(steps).toContain("llm.response");

    const request = events.find((e: { step: string }) => e.step === "llm.request");
    expect(request.data.provider).toBe("extractive");
    expect(request.data.sent).toContain("CITIZEN QUESTION");
    expect(request.data.sent).toContain("how do i renew my driving licence");
    expect(JSON.stringify(request)).not.toMatch(/api[_-]?key/i);

    const response = events.find((e: { step: string }) => e.step === "llm.response");
    expect(response.data.answer).toContain("30,000");
    expect(response.data.citations).toEqual(["MPWT-DL-001"]);
  });
});
