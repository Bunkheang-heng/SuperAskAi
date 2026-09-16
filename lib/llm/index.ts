/**
 * Provider selection and the NFR-09 degradation path.
 *
 * Callers ask for a provider and get one. They never learn which, beyond what
 * the diagnostic payload reports. That is the whole point of NFR-18.
 */

import { createAnthropicProvider } from "./anthropic";
import { createGatewayProvider } from "./gateway";
import { createSealionProvider } from "./sealion";
import { createVllmProvider } from "./vllm";
import { createExtractiveProvider } from "./extractive";
import { buildUserContent } from "./provider";
import { trace } from "@/lib/log/trace";
import type {
  GenerationRequest,
  GenerationResult,
  LlmProvider,
} from "./provider";

export type { GenerationRequest, GenerationResult, LlmProvider };
export type { GenerationMode } from "./provider";
export { PROMPT_VERSION, GENERAL_PROMPT_VERSION } from "./provider";

function selectConfigured(): LlmProvider {
  const configured = (process.env.LLM_PROVIDER ?? "extractive").toLowerCase();

  switch (configured) {
    case "anthropic":
      return createAnthropicProvider();
    case "gateway":
      return createGatewayProvider();
    case "sealion":
    case "sea-lion":
      return createSealionProvider();
    case "vllm":
      return createVllmProvider();
    case "extractive":
      return createExtractiveProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${configured}`);
  }
}

export interface GenerateOutcome extends GenerationResult {
  provider: LlmProvider["info"];
  /** Set when the configured provider failed and the fallback served. */
  fallbackReason?: string;
}

/**
 * Generate an answer, degrading to extraction rather than to failure.
 *
 * A model outage, an auth failure, a timeout, or output that does not satisfy
 * the answer contract all land here. In every case the citizen still gets the
 * retrieved provision and the offer of an officer, and the diagnostic payload
 * records what actually happened so the failure is visible to operators rather
 * than silent.
 */
export async function generate(
  req: GenerationRequest,
): Promise<GenerateOutcome> {
  let provider: LlmProvider;
  const started = Date.now();
  const mode = req.mode ?? "grounded";

  try {
    provider = selectConfigured();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    trace("llm.error", { stage: "select", reason });
    const fallback = createExtractiveProvider(`Configuration error: ${reason}`);
    const result = await fallback.generate(req);
    trace("llm.response", {
      provider: fallback.info.id,
      model: fallback.info.model,
      mode,
      fallbackReason: reason,
      ...result,
      ms: Date.now() - started,
    });
    return { ...result, provider: fallback.info, fallbackReason: reason };
  }

  trace("llm.request", {
    provider: provider.info.id,
    model: provider.info.model,
    mode,
    lang: req.lang,
    sourceIds: req.sources.map((s) => s.id),
    historyTurns: req.history?.length ?? 0,
    history: (req.history ?? []).slice(-4).map((m) => ({
      role: m.role,
      text: m.text,
    })),
    sent: buildUserContent(req),
  });

  try {
    const result = await provider.generate(req);
    trace("llm.response", {
      provider: provider.info.id,
      model: provider.info.model,
      mode,
      ...result,
      ms: Date.now() - started,
    });
    return { ...result, provider: provider.info };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    trace("llm.error", {
      provider: provider.info.id,
      model: provider.info.model,
      reason,
      ms: Date.now() - started,
    });
    const fallback = createExtractiveProvider(
      `${provider.info.label} unavailable. Degraded to extraction (NFR-09).`,
    );
    const result = await fallback.generate(req);
    trace("llm.response", {
      provider: fallback.info.id,
      model: fallback.info.model,
      mode,
      fallbackReason: `${provider.info.id}: ${reason}`,
      ...result,
      ms: Date.now() - started,
    });
    return {
      ...result,
      provider: fallback.info,
      fallbackReason: `${provider.info.id}: ${reason}`,
    };
  }
}

/** Provider metadata without making a call, for the diagnostic panel. */
export function describeProvider(): LlmProvider["info"] {
  try {
    return selectConfigured().info;
  } catch {
    return createExtractiveProvider().info;
  }
}
