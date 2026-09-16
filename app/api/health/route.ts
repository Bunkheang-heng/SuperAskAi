/**
 * GET /api/health
 *
 * Operational readiness. Reports the configured provider and its residency,
 * because NFR-11 turns on residency and an operator needs to be able to confirm
 * at a glance which way a running instance is configured.
 *
 * Never reports a credential, only whether one is present.
 */

import { NextResponse } from "next/server";
import { describeProvider } from "@/lib/llm";
import { getKb } from "@/lib/kb/loader";
import { ministryFreshnessScore } from "@/lib/engine/freshness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = describeProvider();
  const kb = getKb();
  const freshness = ministryFreshnessScore(kb.chunks);

  return NextResponse.json(
    {
      status: "ok",
      provider: {
        id: provider.id,
        model: provider.model,
        hosting: provider.hosting,
        residency: provider.residency,
        credentialPresent: Boolean(
          process.env.ANTHROPIC_API_KEY ||
            process.env.LLM_GATEWAY_API_KEY ||
            process.env.SEALION_API_KEY ||
            process.env.VLLM_API_KEY,
        ),
        baseUrlOverridden: Boolean(process.env.ANTHROPIC_BASE_URL?.trim()),
      },
      knowledgeBase: {
        chunks: kb.chunks.length,
        ministries: [...new Set(kb.chunks.map((c) => c.ministry))],
        curatedAnswers: kb.curated.length,
        builtAt: kb.builtAt,
        // M-05, reported per ministry rather than in aggregate (section 4.2).
        freshnessByMinistry: Object.fromEntries(
          [...freshness.entries()].map(([ministry, s]) => [
            ministry,
            { verifiedWithin90Days: s.verified, total: s.total, score: Number(s.score.toFixed(2)) },
          ]),
        ),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
