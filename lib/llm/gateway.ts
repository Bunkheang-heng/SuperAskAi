/**
 * Phase 0 alternative provider: an OpenAI-compatible model gateway.
 *
 * A gateway fronts many model families (Anthropic, Google, Qwen, DeepSeek,
 * OpenAI) behind one endpoint and one credential. That makes it the cheapest way
 * to run the Phase 0 pilot and — more usefully — to satisfy section 10.6
 * condition 4, which requires candidate models to be benchmarked against the
 * Khmer golden question set before the Phase 1 migration decision. Swapping the
 * candidate under test is one environment variable, not a new integration.
 *
 * ── RESIDENCY WARNING ──────────────────────────────────────────────────────
 * This is external hosting, outside Cambodia, and it is a *third party* between
 * AskGov and the model vendor. It carries the same NFR-11 exemption limits as
 * the direct Anthropic path (R-14): closed pilot with DGC and ministry staff
 * only, lapsing at public release. It reports its residency honestly so the
 * diagnostic panel flags it and the audit log records it. Do not present this
 * provider as domestic.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * The API key is read from the server environment and never leaves this process
 * (FR-74, R-15).
 */

import {
  systemPromptFor,
  jsonContractFor,
  buildUserContent,
  parseGeneration,
  type GenerationRequest,
  type GenerationResult,
  type LlmProvider,
  type ProviderInfo,
} from "./provider";

const DEFAULT_BASE_URL = "https://inference-api.nousresearch.com/v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-5";
const MAX_TOKENS = 1600;

/**
 * Request timeout. Configurable because 30s is not one number for all cases:
 * a Khmer answer costs several times the output tokens of the same answer in
 * English, and the unsourced fallback writes from scratch rather than
 * condensing a supplied provision. Both together reliably exceeded 30s on a
 * reasoning-family model, and the abort surfaced as an ordinary refusal — the
 * fallback appeared not to work at all rather than to be slow.
 *
 * Raising this trades against NFR-06. Lowering the latency properly means a
 * faster model (LLM_GATEWAY_MODEL), not a longer wait.
 */
const TIMEOUT_MS = Number(process.env.LLM_GATEWAY_TIMEOUT_MS ?? "30000");

export function createGatewayProvider(): LlmProvider {
  const apiKey = process.env.LLM_GATEWAY_API_KEY?.trim();
  if (!apiKey) throw new Error("LLM_GATEWAY_API_KEY is not set");

  const baseUrl = process.env.LLM_GATEWAY_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.LLM_GATEWAY_MODEL?.trim() || DEFAULT_MODEL;

  /**
   * Reasoning-family models on a gateway return their chain of thought in a
   * separate field, but some emit a preamble into content as well. Requesting a
   * JSON response format suppresses most of it; parseGeneration() tolerates the
   * rest rather than failing the request. Set LLM_GATEWAY_JSON_MODE=off if a
   * particular model 400s on response_format.
   */
  const jsonMode = process.env.LLM_GATEWAY_JSON_MODE?.trim() !== "off";

  const info: ProviderInfo = {
    id: "gateway",
    label: `Model gateway (${model})`,
    model,
    hosting: `External gateway (${baseUrl})`,
    // Deliberately not "Cambodia". A third-party gateway is a further hop away
    // from domestic hosting than the direct vendor API, and the diagnostic panel
    // colours anything that is not "Cambodia" as a notice (NFR-11).
    residency: "External, non-domestic",
    note: "Pilot and model-benchmarking path only. Not permitted for public release; live citizen queries must be domestically hosted from Phase 1 (R-14, NFR-11).",
  };

  async function generate(req: GenerationRequest): Promise<GenerationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          // Zero temperature because a procedural answer that varies between
          // identical questions is an audit problem, not a feature (FR-55).
          temperature: 0,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages: [
            {
              role: "system",
              content: systemPromptFor(req) + "\n" + jsonContractFor(req),
            },
            ...req.history.slice(-4).map((m) => ({
              role: m.role,
              content: m.text,
            })),
            { role: "user", content: buildUserContent(req) },
          ],
        }),
      });

      if (!res.ok) {
        // The body carries the actual cause (bad model id, credit exhausted,
        // unsupported parameter). Losing it turns every failure into the same
        // opaque line in the audit log.
        const detail = await res.text().catch(() => "");
        throw new Error(
          `Gateway returned ${res.status} ${res.statusText}${
            detail ? `: ${detail.slice(0, 300)}` : ""
          }`,
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error("Gateway returned no content");

      return parseGeneration(raw, req.mode);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { info, generate };
}
