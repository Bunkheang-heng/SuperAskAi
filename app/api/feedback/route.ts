/**
 * POST /api/feedback
 *
 * Citizen reports of an incorrect answer (FR-50, FR-67). The report is routed
 * to the steward of the ministry that owns the cited content; in this build the
 * routing target is the append-only feedback log, which the content management
 * portal will read as a review-queue source.
 */

import { NextResponse } from "next/server";
import { recordFeedback } from "@/lib/log/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set(["incorrect", "helpful", "unhelpful"]);
const MAX_COMMENT = 2000;

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
    kind?: unknown;
    comment?: unknown;
    citedIds?: unknown;
    ministries?: unknown;
  };

  const answerId = typeof input.answerId === "string" ? input.answerId : "";
  const kind = typeof input.kind === "string" ? input.kind : "";

  if (!answerId || !KINDS.has(kind)) {
    return NextResponse.json(
      { error: "answerId and a valid kind are required" },
      { status: 400 },
    );
  }

  const comment =
    typeof input.comment === "string"
      ? input.comment.slice(0, MAX_COMMENT)
      : undefined;

  const asStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  await recordFeedback({
    answerId,
    kind: kind as "incorrect" | "helpful" | "unhelpful",
    comment,
    citedIds: asStrings(input.citedIds),
    ministries: asStrings(input.ministries),
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
