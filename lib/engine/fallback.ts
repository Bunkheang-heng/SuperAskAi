/**
 * Unsourced fallback — the operator switch on section 13's core trade-off.
 *
 * OFF (`GENERAL_FALLBACK_ENABLED=false`) is the PRD behaviour: no approved
 * source, no answer. ON lets the model answer a coverage gap from its own
 * knowledge, labelled unverified, with the officer still offered.
 *
 * It is ON by default in this build because the corpus is four ministries of
 * sample content. Even when ON, it does not invent a government procedure —
 * fees, offices, deadlines — for a coverage gap. That answer is a refusal and
 * an officer, not a fluent guess. The flag remains for the rare in-scope
 * question that is not a procedure and not a follow-up in a service thread.
 *
 * What it does NOT loosen: the §12 policy guardrails, the off-domain screen,
 * the entity-lookup boundary, and — for any answer that DOES have sources —
 * the verification gate. Those all still run first and unchanged.
 */

import type { AskResponse, Diagnostics, Lang } from "@/lib/types";
import { UNVERIFIED_NOTICE } from "@/lib/ui/copy";
import { generate, GENERAL_PROMPT_VERSION } from "@/lib/llm";
import { isOffDomain, looksLikeServiceQuestion } from "./guardrails";
import { looksLikeEntityLookup } from "./topicality";
import { supportOffice } from "./citations";

export const GENERAL_FALLBACK_ENABLED =
  (process.env.GENERAL_FALLBACK_ENABLED ?? "true").toLowerCase() !== "false";

export interface GeneralFallbackInput {
  question: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  lang: Lang;
  normalisedQuery: string;
  id: string;
  retrievalDiag: Partial<Diagnostics>;
  finish: (res: AskResponse, diag: Diagnostics) => AskResponse;
  baseDiagnostics: (over: Partial<Diagnostics>) => Diagnostics;
}

/**
 * Returns null when the fallback is off, when no model is available, or when
 * the model itself declines — every one of which means the caller should carry
 * on to its refusal.
 *
 * Two callers, because there are two ways to arrive at "no approved source
 * answers this". Retrieval can find nothing above the floor, or it can find
 * something plausible that turns out not to answer the question, which the
 * grounded generation reports by escalating. The second is the common one on
 * a follow-up turn: history pulls the rewritten query toward whatever the
 * corpus does cover, so the passport question retrieves driving-licence
 * provisions and lands here rather than below the floor.
 */
export async function tryGeneralFallback(
  input: GeneralFallbackInput,
): Promise<AskResponse | null> {
  if (!GENERAL_FALLBACK_ENABLED) return null;

  /*
    The scope screens belong here rather than at each call site, because they
    were at one call site and not the other and both leaked immediately:
    "what is the capital of France" came back as "Paris is the capital of
    France" — SuperAsk answering as a general assistant, which §6.1 says it is
    not — and a trademark lookup got an invented office location and search
    fee in place of the §6.2 copy that names the real public registers.

    A coverage gap is the only thing this fallback is for. Out of scope stays
    out of scope however thin the corpus is.
  */
  if (isOffDomain(input.question, input.history) || looksLikeEntityLookup(input.question))
    return null;

  /*
    A coverage gap on a government procedure is a refusal, not an invitation
    to invent fees, offices, or deadlines from the model's memory. That is
    what "how do I get married?" produced once the rewrite leak sent it here:
    a fluent Sangkat script that was not in any approved source. Follow-ups
    in a service thread ("where in phnom penh?") are the same class of ask.
  */
  const serviceThread =
    looksLikeServiceQuestion(input.question) ||
    input.history.some(
      (t) => t.role !== "assistant" && looksLikeServiceQuestion(t.text),
    );
  if (serviceThread) return null;

  const general = await generate({
    question: input.question,
    lang: input.lang,
    sources: [],
    history: input.history,
    mode: "general",
  });

  // Rule 5 of the general prompt tells the model to decline rather than guess
  // at a procedure it does not know, so a decline is a real signal, not a
  // formality. An extractive degradation lands here too, and must not be
  // dressed up as an unverified answer.
  if (!general.answer || general.shouldEscalate) return null;

  return input.finish(
    {
      id: input.id,
      tier: 2,
      lang: input.lang,
      answer: `${general.answer}\n\n${UNVERIFIED_NOTICE[input.lang]}`,
      // Never any: an unsourced answer with a citation would be a fabricated
      // government reference.
      citations: [],
      // Still offered. The officer is the path to a confirmed answer, and
      // that matters more here than after a sourced one.
      escalate: true,
      office: supportOffice(),
      unverified: true,
    },
    input.baseDiagnostics({
      tier: 2,
      ...input.retrievalDiag,
      provider: general.provider.id,
      model: general.provider.model,
      hosting: general.provider.hosting,
      residency: general.provider.residency,
      providerFallback: general.fallbackReason,
      promptVersion: GENERAL_PROMPT_VERSION,
      // Nothing was verified against a source, so the verification gate did
      // not run. Reporting passed:true would misread as "checked".
      verification: { passed: false, unsupported: ["(unsourced answer)"] },
      confidence: "low",
      refusalReason: "fallback:general_knowledge",
    }),
  );
}
