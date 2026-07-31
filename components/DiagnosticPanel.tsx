"use client";

/**
 * Internal diagnostic view (FR-72).
 *
 * Exposes answer tier, active model provider, retrieval candidates with their
 * component and fused scores, cited sources, confidence, and latency.
 *
 * FR-73: available to DGC and ministry users only, never to citizens. In this
 * build the gate is the DIAGNOSTICS_ENABLED server flag — when it is off the
 * server omits the payload entirely, so the panel has nothing to render and the
 * data never crosses the network. That is the right shape for the gate: a
 * client-side hide would still ship retrieval internals to every citizen's
 * browser. Before public release this needs to become a role check against the
 * RBAC model in FR-59.
 */

import { X } from "lucide-react";
import type { Diagnostics, Lang } from "@/lib/types";
import { T, monoStack } from "@/lib/theme";
import { UI } from "@/lib/ui-copy";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3" style={{ lineHeight: 1.9 }}>
      <span style={{ color: T.inkFaint }}>{k}</span>
      <span style={{ color: T.ink, textAlign: "right", wordBreak: "break-word" }}>
        {v}
      </span>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return (
    <div
      style={{
        marginTop: 18,
        marginBottom: 4,
        color: T.inkFaint,
        letterSpacing: "0.08em",
        fontSize: 9.5,
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

export function DiagnosticPanel({
  diagnostics,
  lang,
  onClose,
}: {
  diagnostics: Diagnostics;
  lang: Lang;
  onClose: () => void;
}) {
  const d = diagnostics;

  return (
    <aside
      className="ag-scroll shrink-0 overflow-y-auto"
      style={{
        width: 336,
        background: T.paper,
        borderLeft: `1px solid ${T.line}`,
      }}
      aria-label={UI.traceTitle[lang]}
    >
      <div
        className="sticky top-0 flex items-center justify-between px-4 py-3"
        style={{ background: T.paper, borderBottom: `1px solid ${T.line}` }}
      >
        <span
          className="ag-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: T.inkSoft,
          }}
        >
          {UI.traceTitle.en}
        </span>
        <button
          onClick={onClose}
          style={{ color: T.inkFaint }}
          aria-label={UI.cancel[lang]}
        >
          <X size={15} aria-hidden />
        </button>
      </div>

      <div
        style={{
          margin: 12,
          padding: "8px 10px",
          background: T.noticeWash,
          border: `1px solid ${T.noticeLine}`,
          borderRadius: 8,
          fontSize: 10.5,
          color: T.noticeText,
          lineHeight: 1.6,
        }}
      >
        {UI.traceInternal.en}
      </div>

      <div
        className="ag-mono px-4 pb-6"
        style={{ fontSize: 11, color: T.ink }}
      >
        <Section label="Answer" />
        <Row k="tier" v={d.tier} />
        <Row k="confidence" v={d.confidence} />
        <Row k="latency" v={`${d.latencyMs}ms`} />
        {d.refusalReason && (
          <Row
            k="withheld"
            v={
              <span
                style={{
                  // A policy refusal and a coverage gap need different
                  // responses — one is governance, one is a content task — so
                  // they are not the same colour.
                  color: d.refusalReason.startsWith("policy:")
                    ? T.red
                    : T.noticeText,
                }}
              >
                {d.refusalReason}
              </span>
            }
          />
        )}

        <Section label="Model" />
        <Row k="provider" v={d.provider} />
        <Row k="model" v={d.model} />
        <Row k="hosting" v={d.hosting} />
        <Row
          k="residency"
          v={
            <span
              style={{
                // NFR-11 is a residency requirement, so a non-domestic
                // residency is worth flagging to an operator every time.
                color: d.residency === "Cambodia" ? T.green : T.noticeText,
              }}
            >
              {d.residency}
            </span>
          }
        />
        <Row k="prompt" v={d.promptVersion} />
        {d.providerFallback && (
          <>
            <Section label="Provider fallback (NFR-09)" />
            <div
              style={{
                color: T.red,
                fontSize: 10.5,
                lineHeight: 1.7,
                wordBreak: "break-word",
              }}
            >
              {d.providerFallback}
            </div>
          </>
        )}

        <Section label="Query processing" />
        <Row k="language" v={d.detectedLang} />
        {d.rewrittenQuery && (
          <div style={{ marginTop: 6 }}>
            <div style={{ color: T.inkFaint, fontSize: 10 }}>
              rewritten (FR-07)
            </div>
            <div style={{ fontSize: 10.5, lineHeight: 1.7 }}>
              {d.rewrittenQuery}
            </div>
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          <div style={{ color: T.inkFaint, fontSize: 10 }}>
            normalised (FR-04)
          </div>
          <div className="km" style={{ fontSize: 10.5 }}>
            {d.normalisedQuery}
          </div>
        </div>
        {d.segments.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ color: T.inkFaint, fontSize: 10 }}>
              segments (FR-05) · {d.segments.length}
            </div>
            <div className="km" style={{ fontSize: 10.5, lineHeight: 1.8 }}>
              {d.segments.join(" | ")}
            </div>
          </div>
        )}
        {d.expandedTerms.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ color: T.inkFaint, fontSize: 10 }}>
              alias expansion (FR-06)
            </div>
            <div className="km" style={{ fontSize: 10.5, lineHeight: 1.8 }}>
              {d.expandedTerms.join(" | ")}
            </div>
          </div>
        )}

        <Section label={`Retrieval candidates · ${d.candidates.length}`} />
        <div
          className="flex gap-2"
          style={{ fontSize: 9, color: T.inkFaint, paddingBottom: 3 }}
        >
          <span style={{ flex: 1 }}>id</span>
          <span style={{ width: 34, textAlign: "right" }}>bm25</span>
          <span style={{ width: 34, textAlign: "right" }}>vec</span>
          <span style={{ width: 34, textAlign: "right" }}>rrf</span>
          <span style={{ width: 34, textAlign: "right" }}>rank</span>
        </div>
        {d.candidates.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded px-1.5 py-1"
            style={{
              fontSize: 10,
              marginBottom: 2,
              background: c.cited ? T.skyWash : "transparent",
              border: `1px solid ${c.cited ? T.skyLine : "transparent"}`,
            }}
          >
            <span
              style={{
                flex: 1,
                color: c.cited ? T.deep : T.inkSoft,
                fontWeight: c.cited ? 600 : 400,
              }}
            >
              {c.id}
              {c.cited && (
                <span style={{ color: T.green, fontWeight: 400 }}> ·cited</span>
              )}
            </span>
            <span style={{ width: 34, textAlign: "right", color: T.inkSoft }}>
              {c.lexical.toFixed(2)}
            </span>
            <span style={{ width: 34, textAlign: "right", color: T.inkSoft }}>
              {c.dense.toFixed(2)}
            </span>
            <span style={{ width: 34, textAlign: "right", color: T.inkSoft }}>
              {c.fused.toFixed(2)}
            </span>
            <span style={{ width: 34, textAlign: "right", color: T.ink }}>
              {c.rerank.toFixed(2)}
            </span>
          </div>
        ))}

        <Section label="Verification gate (FR-15)" />
        <Row
          k="passed"
          v={
            <span style={{ color: d.verification.passed ? T.green : T.red }}>
              {String(d.verification.passed)}
            </span>
          }
        />
        {d.verification.unsupported.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ color: T.inkFaint, fontSize: 10 }}>
              unsupported claims
            </div>
            <div style={{ color: T.red, fontSize: 10.5, lineHeight: 1.8 }}>
              {d.verification.unsupported.join(", ")}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
