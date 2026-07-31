/**
 * Phase 1 target provider: self-hosted Qwen on DGC infrastructure (RD-02).
 *
 * vLLM exposes an OpenAI-compatible interface, which is why the abstraction
 * layer above targets that shape (section 10.6 condition 2): migration is a
 * configuration change, not a rewrite.
 *
 * Before this becomes the live path, section 10.6 requires:
 *   - Qwen benchmarked against the Khmer golden question set during Phase 0,
 *     alongside SEA-LION and other candidates (condition 4, R-13).
 *   - Licence terms reviewed and approved by DGC legal counsel (NFR-20, D-08).
 *   - Prompt templates and output contracts revalidated against Qwen, because
 *     instruction-following differs between model families (condition 6).
 */

import {
  GROUNDING_PROMPT,
  JSON_CONTRACT_INSTRUCTION,
  buildUserContent,
  parseGeneration,
  type GenerationRequest,
  type GenerationResult,
  type LlmProvider,
  type ProviderInfo,
} from "./provider";

export function createVllmProvider(): LlmProvider {
  const baseUrl =
    process.env.VLLM_BASE_URL?.trim() ||
    "http://inference.internal.dgc:8000/v1";
  const model = process.env.VLLM_MODEL?.trim() || "qwen3-32b-instruct";
  const apiKey = process.env.VLLM_API_KEY?.trim();

  const info: ProviderInfo = {
    id: "vllm",
    label: "Qwen (self-hosted, vLLM)",
    model,
    hosting: "DGC infrastructure",
    residency: "Cambodia",
    note: "Target state. Requires GPU procurement and licence review (OD-03, D-06, NFR-20).",
  };

  async function generate(req: GenerationRequest): Promise<GenerationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          max_tokens: 1600,
          temperature: 0,
          // vLLM supports guided decoding against a JSON schema on recent
          // versions. Where it does not, parseGeneration() tolerates fences and
          // preambles rather than failing the request.
          response_format: { type: "json_object" },
          messages: [
            // json_object guarantees parseable JSON, not the right fields. The
            // contract has to be stated in the prompt as well or the model
            // returns a well-formed object of its own invention.
            {
              role: "system",
              content: GROUNDING_PROMPT + "\n" + JSON_CONTRACT_INSTRUCTION,
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
        throw new Error(
          `vLLM endpoint returned ${res.status} ${res.statusText}`,
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error("vLLM endpoint returned no content");

      return parseGeneration(raw);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { info, generate };
}
