import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GenerationRequest } from "@/lib/llm/provider";

/**
 * The OpenAI-compatible gateway — the provider this build actually runs on.
 *
 * Two things are worth pinning here and neither is about model quality: the
 * credential must never leave this layer (FR-74, R-15), and the provider must
 * report its residency honestly, because §10.6 / NFR-11 turn on it and the
 * diagnostic panel colours anything that is not "Cambodia" as a notice.
 *
 * fetch is mocked throughout. No network call is made.
 */

const KEY = "sk-nous-test-credential-never-logged";

const SOURCE: GenerationRequest["sources"][number] = {
  id: "MPWT-DL-001",
  header: "Ministry of Public Works and Transport — Driver's Licence",
  text: "The renewal fee is 30,000 riel.",
};

function request(over: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    question: "how do i renew my driving licence",
    lang: "en",
    sources: [SOURCE],
    history: [],
    ...over,
  } as GenerationRequest;
}

function okResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
    text: async () => "",
  } as unknown as Response;
}

const ANSWER = {
  answer: "The renewal fee is 30,000 riel.",
  citations: ["MPWT-DL-001"],
  confidence: "high",
  should_escalate: false,
};

let fetchMock: ReturnType<typeof vi.fn>;

async function load() {
  vi.resetModules();
  return (await import("@/lib/llm/gateway")).createGatewayProvider;
}

beforeEach(() => {
  vi.stubEnv("LLM_GATEWAY_API_KEY", KEY);
  vi.stubEnv("LLM_GATEWAY_BASE_URL", "https://gateway.invalid/v1");
  vi.stubEnv("LLM_GATEWAY_MODEL", "openai/gpt-5.6-terra-pro");
  fetchMock = vi.fn().mockResolvedValue(okResponse(ANSWER));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** The parsed request body of the Nth fetch call. */
function sentBody(call = 0) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string);
}

describe("construction", () => {
  it("refuses to construct without a credential", async () => {
    vi.stubEnv("LLM_GATEWAY_API_KEY", "");
    const create = await load();
    expect(() => create()).toThrow(/LLM_GATEWAY_API_KEY is not set/);
  });

  it("treats a whitespace-only credential as absent", async () => {
    vi.stubEnv("LLM_GATEWAY_API_KEY", "   ");
    const create = await load();
    expect(() => create()).toThrow(/not set/);
  });

  it("reports residency as non-domestic, never as Cambodia (NFR-11, R-14)", async () => {
    const provider = (await load())();
    expect(provider.info.residency).toBe("External, non-domestic");
    expect(provider.info.residency).not.toMatch(/cambodia/i);
  });

  it("says in its own note that it is not permitted for public release", async () => {
    const provider = (await load())();
    expect(provider.info.note).toMatch(/not permitted for public release/i);
  });

  it("names the model in its label, so the trace says which one answered", async () => {
    const provider = (await load())();
    expect(provider.info.label).toContain("openai/gpt-5.6-terra-pro");
    expect(provider.info.model).toBe("openai/gpt-5.6-terra-pro");
  });

  it("never exposes the credential in its metadata (FR-74, R-15)", async () => {
    const provider = (await load())();
    expect(JSON.stringify(provider.info)).not.toContain(KEY);
    expect(JSON.stringify(provider.info)).not.toContain("sk-nous");
  });
});

describe("request shaping", () => {
  it("sends the credential as a bearer token and nowhere else", async () => {
    const provider = (await load())();
    await provider.generate(request());

    const [url, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    // Not in the URL, where it would land in proxy logs.
    expect(String(url)).not.toContain(KEY);
    expect(init.body).not.toContain(KEY);
  });

  it("posts to the chat completions path on the configured base URL", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://gateway.invalid/v1/chat/completions",
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("sends temperature 0 — a procedural answer that varies is an audit problem", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(sentBody().temperature).toBe(0);
  });

  it("requests a JSON response format by default", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(sentBody().response_format).toEqual({ type: "json_object" });
  });

  it("omits response_format when LLM_GATEWAY_JSON_MODE=off", async () => {
    vi.stubEnv("LLM_GATEWAY_JSON_MODE", "off");
    const provider = (await load())();
    await provider.generate(request());
    expect(sentBody().response_format).toBeUndefined();
  });

  it("puts the prompt and the JSON contract in the system message", async () => {
    const provider = (await load())();
    await provider.generate(request());
    const [system] = sentBody().messages;
    expect(system.role).toBe("system");
    expect(system.content).toMatch(/Royal Government of Cambodia/i);
  });

  it("puts the sources and the question in the final user message", async () => {
    const provider = (await load())();
    await provider.generate(request());
    const messages = sentBody().messages;
    const last = messages[messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toContain("[MPWT-DL-001]");
    expect(last.content).toContain("how do i renew my driving licence");
  });

  it("carries at most the last four history turns", async () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: "user" as const,
      text: `turn ${i}`,
    }));
    const provider = (await load())();
    await provider.generate(request({ history } as Partial<GenerationRequest>));

    const messages = sentBody().messages;
    // system + 4 history + 1 user
    expect(messages).toHaveLength(6);
    expect(messages[1].content).toBe("turn 6");
  });

  it("uses the documented default base URL when none is configured", async () => {
    vi.stubEnv("LLM_GATEWAY_BASE_URL", "");
    const provider = (await load())();
    await provider.generate(request());
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "inference-api.nousresearch.com",
    );
  });
});

describe("response handling", () => {
  it("parses a well-formed answer", async () => {
    const provider = (await load())();
    const res = await provider.generate(request());
    expect(res).toEqual({
      answer: "The renewal fee is 30,000 riel.",
      citations: ["MPWT-DL-001"],
      confidence: "high",
      shouldEscalate: false,
    });
  });

  it("keeps the response body in the error, so the audit log records the real cause", async () => {
    // Losing it turns every failure into the same opaque line.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "invalid x-api-key",
    } as unknown as Response);

    const provider = (await load())();
    await expect(provider.generate(request())).rejects.toThrow(
      /401 Unauthorized.*invalid x-api-key/,
    );
  });

  it("throws on an empty content field rather than returning a blank answer", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [{ message: { content: "" } }] }),
      text: async () => "",
    } as unknown as Response);

    const provider = (await load())();
    await expect(provider.generate(request())).rejects.toThrow(/no content/i);
  });

  it("throws when the gateway returns no choices at all", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
      text: async () => "",
    } as unknown as Response);

    const provider = (await load())();
    await expect(provider.generate(request())).rejects.toThrow(/no content/i);
  });

  it("applies general-mode parsing rules when asked for general mode", async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({ answer: "a", citations: ["INVENTED-1"], confidence: "high" }),
    );
    const provider = (await load())();
    const res = await provider.generate(request({ mode: "general", sources: [] }));

    // An id here was invented — there were no sources.
    expect(res.citations).toEqual([]);
    expect(res.confidence).toBe("medium");
  });

  it("passes an abort signal so a slow model cannot hang the request (NFR-06)", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("clears its timeout on the error path as well as the success path", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const provider = (await load())();
    await expect(provider.generate(request())).rejects.toThrow(/network down/);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
