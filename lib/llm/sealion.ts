/**
 * Phase 0 candidate provider: SEA-LION via AI Singapore's OpenAI-compatible API.
 *
 * SEA-LION is trained for Southeast Asian languages, including Khmer, which is
 * why it is listed as a Phase 0 benchmark candidate alongside Qwen (section
 * 10.6 condition 4, R-13). The hosted API is OpenAI-compatible, so this file
 * is a configuration surface, not a new protocol.
 *
 * ── RESIDENCY WARNING ──────────────────────────────────────────────────────
 * Hosted by AI Singapore, outside Cambodia. Same NFR-11 exemption limits as
 * the Anthropic path (R-14): closed pilot with DGC and ministry staff only,
 * lapsing at public release. Reports residency honestly so the diagnostic
 * panel flags it. Do not present this provider as domestic.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * The API key is read from the server environment and never leaves this process
 * (FR-74, R-15). Get a key at https://playground.sea-lion.ai/
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
import { trace } from "@/lib/log/trace";

const DEFAULT_BASE_URL = "https://api.sea-lion.ai/v1";
const DEFAULT_MODEL = "aisingapore/Qwen-SEA-LION-v4.5-27B-IT";
const MAX_TOKENS = 1600;
const TIMEOUT_MS = Number(process.env.SEALION_TIMEOUT_MS ?? "30000");

export function createSealionProvider(): LlmProvider {
  const apiKey = process.env.SEALION_API_KEY?.trim();
  if (!apiKey) throw new Error("SEALION_API_KEY is not set");

  const baseUrl = process.env.SEALION_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.SEALION_MODEL?.trim() || DEFAULT_MODEL;
  const jsonMode = process.env.SEALION_JSON_MODE?.trim() !== "off";

  const info: ProviderInfo = {
    id: "sealion",
    label: `SEA-LION (${model})`,
    model,
    hosting: `AI Singapore API (${baseUrl})`,
    residency: "External, non-domestic",
    note: "Pilot and Khmer-benchmarking path. Not permitted for public release; live citizen queries must be domestically hosted from Phase 1 (R-14, NFR-11).",
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
          temperature: 0,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          // Qwen-SEA-LION-v4.5 thinks by default. Thinking fills max_tokens
          // and leaves message.content empty, which we then treat as a
          // provider failure. Off is also the latency path (NFR-06).
          chat_template_kwargs: { enable_thinking: false },
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
        const detail = await res.text().catch(() => "");
        trace("llm.raw", {
          status: res.status,
          model,
          error: detail.slice(0, 500),
        });
        throw new Error(
          `SEA-LION returned ${res.status} ${res.statusText}${
            detail ? `: ${detail.slice(0, 300)}` : ""
          }`,
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: unknown;
      };
      const raw = data.choices?.[0]?.message?.content;
      trace("llm.raw", {
        status: res.status,
        model,
        content: raw ?? "",
        usage: data.usage,
      });
      if (!raw) throw new Error("SEA-LION returned no content");

      return parseGeneration(raw, req.mode);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { info, generate };
}
