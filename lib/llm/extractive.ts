/**
 * Deterministic extractive provider. No model, no external call.
 *
 * Two jobs:
 *
 * 1. It makes the system runnable with no credential configured, so retrieval
 *    quality can be measured and the interface exercised before any model
 *    procurement decision lands (OD-05).
 *
 * 2. It is the NFR-09 degradation path: where model services are unavailable
 *    the system degrades to escalation rather than to failure. Serving the
 *    responsible provision verbatim with its citation, and offering an officer,
 *    is a better failure mode for a government service than an error page.
 *
 * It cannot hallucinate, because it only ever returns text copied from a
 * retrieved source. It also cannot synthesise across sources or answer in a
 * language the source is not written in, which is exactly why it is a fallback
 * and not the design.
 */

import type { GenerationRequest, GenerationResult, LlmProvider, ProviderInfo } from "./provider";

const LEAD = {
  en: "From the approved source:",
  km: "ពីឯកសារយោងដែលបានអនុម័ត៖",
};

const NO_KHMER_TEXT = {
  en: "",
  km: "\n\n(ឯកសារយោងនេះមានជាភាសាអង់គ្លេសតែប៉ុណ្ណោះនៅពេលនេះ។)",
};

const NOT_FOUND = {
  en: "SuperAsk has no approved source covering this question. An officer can help you.",
  km: "SuperAsk មិនមានឯកសារយោងដែលបានអនុម័តសម្រាប់សំណួរនេះទេ។ មន្ត្រីអាចជួយអ្នកបាន។",
};

export function createExtractiveProvider(reason?: string): LlmProvider {
  const info: ProviderInfo = {
    id: "extractive",
    label: "Extractive (no model)",
    model: "deterministic-extractive",
    hosting: "In-process",
    residency: "Cambodia",
    note:
      reason ??
      "No model provider configured. Serving retrieved provisions verbatim.",
  };

  async function generate(req: GenerationRequest): Promise<GenerationResult> {
    // Also the general-mode answer: an extractive provider has no knowledge of
    // its own to fall back on, so an unsourced question escalates. The general
    // fallback is a model capability, and where there is no model there is no
    // fallback — which is the correct degradation, not a gap.
    if (req.sources.length === 0) {
      return {
        answer: NOT_FOUND[req.lang],
        citations: [],
        confidence: "low",
        shouldEscalate: true,
      };
    }

    // Quote the single best-ranked provision. Concatenating several produces a
    // wall of text that reads as an answer but is not one; one provision with a
    // visible citation is honest about what the system actually retrieved.
    const top = req.sources[0];

    // FR-08: answer in the citizen's language. Quote the Khmer text of the
    // provision when we have it — quoting the English at a Khmer speaker is a
    // non-answer even when the provision is the right one.
    const quoted =
      req.lang === "km" && top.textKm?.trim() ? top.textKm : top.text;

    // Only warn when the source genuinely has no Khmer version, rather than
    // whenever the quote happens to contain Latin characters (instrument
    // numbers and dates do).
    const khmerMissing = req.lang === "km" && !top.textKm?.trim();

    const answer = [
      LEAD[req.lang],
      "",
      quoted,
      khmerMissing ? NO_KHMER_TEXT.km : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      answer,
      citations: [top.id],
      // Never claims better than medium: a verbatim provision may be the right
      // provision without being a direct answer to what was asked.
      confidence: "medium",
      shouldEscalate: false,
    };
  }

  return { info, generate };
}
