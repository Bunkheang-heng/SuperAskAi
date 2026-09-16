/**
 * POST /api/ask
 *
 * The only path from the citizen interface to a model. Provider credentials
 * live in this process and are never transmitted to the client (FR-74, R-15).
 *
 * Runs on the Node runtime because the knowledge base is read from disk and the
 * audit log is written to it.
 */

import { NextResponse } from "next/server";
import type { AskRequest } from "@/lib/types";
import { ask } from "@/lib/engine";
import { recordAnswer } from "@/lib/log/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 1000;
const MAX_HISTORY_TURNS = 12;

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

  const input = body as Partial<AskRequest>;
  const question = typeof input.question === "string" ? input.question.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer` },
      { status: 413 },
    );
  }

  const history = Array.isArray(input.history)
    ? input.history
        .filter(
          (m): m is { role: "user" | "assistant"; text: string } =>
            Boolean(m) &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.text === "string",
        )
        .slice(-MAX_HISTORY_TURNS)
    : [];

  try {
    const response = await ask({
      question,
      history,
      sessionId: typeof input.sessionId === "string" ? input.sessionId : undefined,
    });

    // Audit before responding, so an answer that reached a citizen is never
    // absent from the log (BR-010). The write is best-effort and never throws.
    await recordAnswer(question, response, response.diagnostics ? input.sessionId : undefined);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/ask] unhandled", err);

    // NFR-09: degrade to escalation, never to a bare failure. The citizen gets
    // a usable next step rather than an error.
    return NextResponse.json(
      {
        id: "error",
        tier: 3,
        lang: "en",
        answer:
          "AskGov could not process that request. A DG Support officer can help you continue.",
        citations: [],
        escalate: true,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
