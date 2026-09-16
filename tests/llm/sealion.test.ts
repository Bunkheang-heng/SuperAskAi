import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GenerationRequest } from "@/lib/llm/provider";

/**
 * SEA-LION via AI Singapore's OpenAI-compatible API.
 *
 * fetch is mocked throughout. No network call is made.
 */

const KEY = "sk-sealion-test-credential-never-logged";

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
  return (await import("@/lib/llm/sealion")).createSealionProvider;
}

beforeEach(() => {
  vi.stubEnv("SEALION_API_KEY", KEY);
  vi.stubEnv("SEALION_BASE_URL", "https://api.sea-lion.ai/v1");
  vi.stubEnv("SEALION_MODEL", "aisingapore/Qwen-SEA-LION-v4.5-27B-IT");
  fetchMock = vi.fn().mockResolvedValue(okResponse(ANSWER));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function sentBody(call = 0) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string);
}

describe("construction", () => {
  it("refuses to construct without a credential", async () => {
    vi.stubEnv("SEALION_API_KEY", "");
    const create = await load();
    expect(() => create()).toThrow(/SEALION_API_KEY is not set/);
  });

  it("treats a whitespace-only credential as absent", async () => {
    vi.stubEnv("SEALION_API_KEY", "   ");
    const create = await load();
    expect(() => create()).toThrow(/not set/);
  });

  it("reports residency as non-domestic, never as Cambodia (NFR-11, R-14)", async () => {
    const provider = (await load())();
    expect(provider.info.residency).toBe("External, non-domestic");
    expect(provider.info.residency).not.toMatch(/cambodia/i);
  });

  it("names the model in its label", async () => {
    const provider = (await load())();
    expect(provider.info.id).toBe("sealion");
    expect(provider.info.label).toContain("SEA-LION");
    expect(provider.info.model).toBe("aisingapore/Qwen-SEA-LION-v4.5-27B-IT");
  });

  it("never exposes the credential in its metadata (FR-74, R-15)", async () => {
    const provider = (await load())();
    expect(JSON.stringify(provider.info)).not.toContain(KEY);
    expect(JSON.stringify(provider.info)).not.toContain("sk-sealion");
  });
});

describe("request shaping", () => {
  it("sends the credential as a bearer token and nowhere else", async () => {
    const provider = (await load())();
    await provider.generate(request());

    const [url, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(String(url)).not.toContain(KEY);
    expect(init.body).not.toContain(KEY);
  });

  it("posts to the chat completions path on the configured base URL", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.sea-lion.ai/v1/chat/completions",
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("sends temperature 0", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(sentBody().temperature).toBe(0);
  });

  it("requests a JSON response format by default", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(sentBody().response_format).toEqual({ type: "json_object" });
  });

  it("turns off thinking so content is not swallowed by reasoning tokens", async () => {
    const provider = (await load())();
    await provider.generate(request());
    expect(sentBody().chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it("omits response_format when SEALION_JSON_MODE=off", async () => {
    vi.stubEnv("SEALION_JSON_MODE", "off");
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

  it("uses the documented default base URL when none is configured", async () => {
    vi.stubEnv("SEALION_BASE_URL", "");
    const provider = (await load())();
    await provider.generate(request());
    expect(String(fetchMock.mock.calls[0][0])).toContain("api.sea-lion.ai");
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

  it("keeps the response body in the error so the audit log records the real cause", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "invalid api key",
    } as unknown as Response);

    const provider = (await load())();
    await expect(provider.generate(request())).rejects.toThrow(
      /401 Unauthorized.*invalid api key/,
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
});
