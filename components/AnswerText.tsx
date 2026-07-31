"use client";

/**
 * Structural rendering of an answer body.
 *
 * Government procedure text is almost never prose. It is numbered steps with
 * sub-conditions under them, and rendering it as one undifferentiated block —
 * which is what a plain <div> with pre-wrap does — throws away the structure the
 * ministry wrote and the citizen needs.
 *
 * It matters more in Khmer than in English. Khmer has no inter-word spaces and
 * no capital letters, so a reader gets none of the shape cues that make a wall
 * of English scannable: no ragged word edges, no sentence-initial capitals to
 * mark where one item ends and the next begins. Indentation, bullets and
 * vertical rhythm are doing the work that word shape does in Latin script, and
 * without them a seven-item list reads as one continuous run of characters.
 *
 * This is presentation only. It re-forms lines the source already contained and
 * never alters, reorders, or summarises them — the verified text is exactly what
 * reaches the screen (FR-14, FR-15).
 */

import { T } from "@/lib/theme";

type Block =
  | { kind: "numbered"; marker: string; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "notice"; text: string }
  | { kind: "para"; text: string };

/** Khmer digits ១-៩ and Latin 1-9, followed by a separator. */
const NUMBERED = /^([០-៩0-9]+)\s*[.)។]\s*(.*)$/;
const BULLET = /^[•·▪-]\s*(.*)$/;

/**
 * The extractive provider's lead-in, and the R-07 aboutness warning.
 *
 * The lead-in ("From the approved source:") is matched so it can be DROPPED,
 * not rendered. The full source receipt sits directly beneath every answer
 * (FR-62) carrying ministry, instrument, article and dates, so printing a
 * second, vaguer provenance label immediately above it said the same thing
 * twice and less precisely. Still matched rather than ignored because the line
 * has to be removed from the body — left in, it would render as a stray
 * sentence fragment at the top of the answer.
 */
const LABEL = /^(From the approved source|ពីឯកសារយោងដែលបានអនុម័ត)\s*[:：]?\s*$/i;
const NOTICE = /^[⚠️!]\s*/;

function parse(text: string): Block[] {
  const blocks: Block[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (LABEL.test(line)) continue;
    if (NOTICE.test(line)) {
      blocks.push({ kind: "notice", text: line.replace(NOTICE, "").trim() });
      continue;
    }

    const numbered = NUMBERED.exec(line);
    // A bare number with nothing after it is a list marker orphaned from its
    // text; treat it as a paragraph rather than an empty heading.
    if (numbered && numbered[2]) {
      blocks.push({ kind: "numbered", marker: numbered[1], text: numbered[2] });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet && bullet[1]) {
      blocks.push({ kind: "bullet", text: bullet[1] });
      continue;
    }

    blocks.push({ kind: "para", text: line });
  }

  return blocks;
}

export function AnswerText({ text }: { text: string }) {
  const blocks = parse(text);

  return (
    <div className="ag-answer km" style={{ fontSize: 15 }}>
      {blocks.map((b, i) => {
        const key = `${b.kind}-${i}`;

        if (b.kind === "notice") {
          return (
            <div
              key={key}
              style={{
                marginTop: 16,
                padding: "10px 12px",
                borderLeft: `3px solid ${T.notice}`,
                background: "rgba(66,149,245,0.06)",
                borderRadius: 4,
                fontSize: 13.5,
                lineHeight: 1.85,
                color: T.noticeText,
              }}
            >
              {b.text}
            </div>
          );
        }

        if (b.kind === "numbered") {
          return (
            <div
              key={key}
              style={{
                display: "flex",
                gap: 10,
                // Space above a new numbered step, not between its sub-points.
                marginTop: i === 0 ? 0 : 18,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  color: T.deep,
                  fontWeight: 600,
                  flexShrink: 0,
                  lineHeight: 1.95,
                }}
              >
                {b.marker}.
              </span>
              <span style={{ fontWeight: 600, lineHeight: 1.95 }}>{b.text}</span>
            </div>
          );
        }

        if (b.kind === "bullet") {
          return (
            <div
              key={key}
              style={{
                display: "flex",
                gap: 10,
                paddingLeft: 14,
                marginTop: 6,
              }}
            >
              <span
                style={{ color: T.sky, flexShrink: 0, lineHeight: 1.95 }}
                aria-hidden
              >
                •
              </span>
              <span style={{ lineHeight: 1.95 }}>{b.text}</span>
            </div>
          );
        }

        return (
          <p key={key} style={{ marginTop: i === 0 ? 0 : 12, lineHeight: 1.95 }}>
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
