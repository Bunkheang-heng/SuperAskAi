/**
 * POST /api/escalate
 *
 * Human handover to DG Support (FR-27, FR-28).
 *
 * Stores the conversation transcript server side against a short reference
 * token, and returns the token plus the Telegram deep link for the citizen's
 * browser to open. DG Support resolves the token to the transcript, so the
 * citizen does not repeat themselves (FR-28) and no question text is placed in a
 * URL.
 *
 * This endpoint does NOT send anything to anyone. It records the handover and
 * hands back a link the citizen chose to follow. Opening a conversation on their
 * behalf without them acting is not a decision this service gets to make.
 */

import { NextResponse } from "next/server";
import { recordEscalation } from "@/lib/log/audit";
import { escalationRef, supportLink, SUPPORT_HANDLE } from "@/lib/ui/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 40;
const MAX_TURN_LENGTH = 4000;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const input = body as {
    answerId?: unknown;
    sessionId?: unknown;
    lang?: unknown;
    transcript?: unknown;
    citedIds?: unknown;
    ministries?: unknown;
  };

  const answerId =
    typeof input.answerId === "string" && input.answerId ? input.answerId : "";

  if (!answerId) {
    return NextResponse.json({ error: "answerId is required" }, { status: 400 });
  }

  const transcript = Array.isArray(input.transcript)
    ? input.transcript
        .filter(
          (t): t is { role: "user" | "assistant"; text: string } =>
            Boolean(t) &&
            (t.role === "user" || t.role === "assistant") &&
            typeof t.text === "string",
        )
        .slice(-MAX_TURNS)
        .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_TURN_LENGTH) }))
    : [];

  const asStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const ref = escalationRef(answerId);

  await recordEscalation({
    ref,
    answerId,
    sessionId: typeof input.sessionId === "string" ? input.sessionId : undefined,
    lang: input.lang === "km" ? "km" : "en",
    transcript,
    citedIds: asStrings(input.citedIds),
    ministries: asStrings(input.ministries),
  });

  return NextResponse.json(
    { ref, url: supportLink(ref), handle: SUPPORT_HANDLE },
    { headers: { "Cache-Control": "no-store" } },
  );
}
