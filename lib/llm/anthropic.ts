/**
 * Phase 0 provider: Claude via the commercial API (RD-01).
 *
 * External hosting, permitted only under the NFR-11 exemption for the closed
 * pilot with DGC and ministry staff. That exemption lapses at Phase 1 public
 * release; from then on live citizen query handling must be domestic (R-14).
 *
 * The API key is read from the server environment and never leaves this process
 * (FR-74).
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  ANSWER_SCHEMA,
  GROUNDING_PROMPT,
  buildUserContent,
  parseGeneration,
  type GenerationRequest,
  type GenerationResult,
  type LlmProvider,
  type ProviderInfo,
} from "./provider";

/**
 * Per-model request shape. The Messages API rejects parameters a model does not
 * support, so this cannot be one static payload:
 *
 *   - Haiku 4.5 / Sonnet 4.5: `effort` errors. Sampling params are accepted.
 *   - Opus 5 / Sonnet 5 / Opus 4.8 / 4.7: `temperature`, `top_p`, `top_k` and
 *     `budget_tokens` all return 400. Depth is controlled by `effort`.
 *
 * Getting this wrong is a 400 on every request, so it is a table rather than
 * scattered conditionals.
 */
interface ModelProfile {
  /** output_config.effort is accepted. */
  supportsEffort: boolean;
  /** temperature / top_p / top_k are accepted. */
  supportsSampling: boolean;
  /** thinking: { type: "adaptive" } is accepted. */
  supportsAdaptiveThinking: boolean;
  maxOutputTokens: number;
}

function modelProfile(model: string): ModelProfile {
  // Newer families: effort yes, sampling no.
  if (
    /^claude-(opus-5|sonnet-5|fable-5|mythos-5|opus-4-8|opus-4-7|opus-4-6|sonnet-4-6)/.test(
      model,
    )
  ) {
    return {
      supportsEffort: true,
      supportsSampling: false,
      supportsAdaptiveThinking: true,
      maxOutputTokens: 128_000,
    };
  }

  // Haiku 4.5, Sonnet 4.5 and older: sampling yes, effort no.
  return {
    supportsEffort: false,
    supportsSampling: true,
    supportsAdaptiveThinking: false,
    maxOutputTokens: 64_000,
  };
}

const DEFAULT_MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1600;

export function createAnthropicProvider(): LlmProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const baseURL = process.env.ANTHROPIC_BASE_URL?.trim() || undefined;
  const model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
  const profile = modelProfile(model);

  const client = new Anthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    maxRetries: 1,
    timeout: 30_000,
  });

  /**
   * Constrained decoding is used only against the first-party API. A gateway or
   * proxy (indicated by a base URL override) may not implement output_config,
   * and a 400 on every request is worse than tolerant JSON parsing. Where it is
   * off, rule 9 of the grounding prompt plus parseGeneration() carry the
   * contract instead.
   */
  const useStructuredOutput = !baseURL;

  const info: ProviderInfo = {
    id: "anthropic",
    label: "Claude (Anthropic API)",
    model,
    hosting: baseURL ? `External gateway (${baseURL})` : "External API",
    residency: "Outside Cambodia",
    note: "Phase 0 only. Live citizen queries must move in-country before public launch (NFR-11).",
  };

  async function generate(req: GenerationRequest): Promise<GenerationResult> {
    const messages: Anthropic.MessageParam[] = [
      // Prior turns give the model the conversational context it needs to read
      // a follow-up correctly. Retrieval has already been done against the
      // rewritten query, so these turns are context, not a retrieval input.
      ...req.history.slice(-4).map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: "user" as const, content: buildUserContent(req) },
    ];

    const params: Record<string, unknown> = {
      model,
      max_tokens: Math.min(MAX_TOKENS, profile.maxOutputTokens),
      system: [
        {
          type: "text",
          text: GROUNDING_PROMPT,
          // The grounding prompt is byte-stable across every request, so it is
          // the natural cache breakpoint. Volatile content (sources, question)
          // sits after it in the messages array.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    };

    if (profile.supportsSampling) {
      // Groundedness is the objective; variety is not (NFR-01).
      params.temperature = 0;
    }

    const outputConfig: Record<string, unknown> = {};
    if (profile.supportsEffort) {
      // Extraction over supplied sources, not open reasoning. Low effort keeps
      // this inside the NFR-06 latency budget.
      outputConfig.effort = "low";
    }
    if (useStructuredOutput) {
      outputConfig.format = { type: "json_schema", schema: ANSWER_SCHEMA };
    }
    if (Object.keys(outputConfig).length > 0) {
      params.output_config = outputConfig;
    }

    const response = await client.messages.create(
      params as unknown as Anthropic.MessageCreateParamsNonStreaming,
    );

    // Safety classifiers can decline a request; the API returns 200 with
    // stop_reason "refusal" and possibly empty content. Reading content[0]
    // unconditionally would throw here.
    if (response.stop_reason === "refusal") {
      return {
        answer: "",
        citations: [],
        confidence: "low",
        shouldEscalate: true,
      };
    }

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return parseGeneration(raw);
  }

  return { info, generate };
}
