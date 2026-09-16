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

import { T } from "@/lib/ui/theme";

type Block =
  | { kind: "numbered"; marker: string; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "notice"; text: string }
  | { kind: "heading"; text: string }
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

/**
 * Markdown emphasis.
 *
 * The prompts ask for a grouped, listed answer, and models write those groups
 * as **Where to go:** headings. Rendering the answer as plain text printed the
 * asterisks literally — the markers were visible and the emphasis was not.
 *
 * Only bold is handled, deliberately. It is the one thing the answer contract
 * actually produces, and a general Markdown renderer here would be a licence to
 * interpret link and image syntax inside text that reaches a citizen.
 *
 * Stripping the markers is presentation, in the same sense as the rest of this
 * file: the words are unchanged and nothing is reordered or dropped.
 */
const BOLD = /\*\*(.+?)\*\*/g;
/** A line that is entirely bold is a group heading, not a bold sentence. */
const HEADING = /^\*\*(.+?)\*\*\s*[:：]?\s*$/;

/** Split on **bold** runs, returning React nodes with the markers removed. */
function inline(text: string, keyPrefix: string) {
  const parts: Array<string | { bold: string }> = [];
  let last = 0;

  for (const m of text.matchAll(BOLD)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push({ bold: m[1] });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  // No emphasis: return the string itself so the common case adds no spans.
  if (parts.length === 1 && typeof parts[0] === "string") return text;

  return parts.map((p, i) =>
    typeof p === "string" ? (
      p
    ) : (
      <strong key={`${keyPrefix}-b${i}`} style={{ fontWeight: 600 }}>
        {p.bold}
      </strong>
    ),
  );
}

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

    const heading = HEADING.exec(line);
    if (heading && heading[1]) {
      blocks.push({ kind: "heading", text: heading[1].trim() });
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
              {inline(b.text, key)}
            </div>
          );
        }

        if (b.kind === "heading") {
          return (
            <div
              key={key}
              className="km"
              style={{
                marginTop: i === 0 ? 0 : 20,
                marginBottom: 2,
                fontWeight: 600,
                color: T.ink,
                lineHeight: 1.7,
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
              <span style={{ fontWeight: 600, lineHeight: 1.95 }}>
                {inline(b.text, key)}
              </span>
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
              <span style={{ lineHeight: 1.95 }}>{inline(b.text, key)}</span>
            </div>
          );
        }

        return (
          <p key={key} style={{ marginTop: i === 0 ? 0 : 12, lineHeight: 1.95 }}>
            {inline(b.text, key)}
          </p>
        );
      })}
    </div>
  );
}
