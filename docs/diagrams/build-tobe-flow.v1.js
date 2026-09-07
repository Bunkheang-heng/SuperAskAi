/*
 * Generates the AskGov Phase 1 "To-Be" process flow diagram (BRD 2.1.2) as SVG.
 *
 *   node docs/diagrams/build-tobe-flow.js
 *
 * Output: docs/diagrams/askgov-tobe-process-flow.svg
 *
 * The SVG imports into Figma as editable layers (drag the file onto the canvas)
 * and renders directly in a browser for PNG export into the BRD.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- palette ---
// Matches docs/diagrams/as-is-process-flow.svg so the two BRD figures read as a set.
const NAV = '#0B4F8F';   // normal flow
const DARK = '#0B4F8F';  // corpus feed
const RED = '#9B2C2C';   // refusal path
const GRN = '#1E6B45';   // approved / curated / content
const PUR = '#5B3BA8';   // officer
const GRY = '#8FA0AF';   // terminal, no officer
const INK = '#12263A';
const MUTED = '#5B6B7B';
const LANE_FILL = '#F7FAFC', LANE_EDGE = '#DCE5ED', LANE_LABEL = '#8FA0AF';

const BOX = { fill: '#FFFFFF', stroke: '#C3DAEE' };
const GATE = { fill: '#FFF7E6', stroke: '#EFD9A8' };
const REFUSE = { fill: '#FDECEC', stroke: '#F3C9C9' };
const OK = { fill: '#EAF6EF', stroke: '#BFE0CE' };
const TERM = { fill: '#EFF2F5', stroke: '#D5DDE4' };
const OFFICER = { fill: '#FFFFFF', stroke: '#D6C9F0' };
const CONTENT = { fill: '#FFFFFF', stroke: '#BFE0CE' };

// ------------------------------------------------------------------- grid ---
const W = 3720, H = 2300;
const COL_W = 360, PITCH = 420, X0 = 300;
const C = i => X0 + PITCH * i;
const CX = i => C(i) + COL_W / 2;

const PAD_X = 18, PAD_T = 15, PAD_B = 15, GAP = 8;
const TITLE_SIZE = 16, TITLE_LH = 20.5;
const DET_SIZE = 12.5, DET_LH = 17.8;

// Greedy wrapper using an average-glyph-width estimate for Inter.
function wrap(text, size, weight, maxW) {
  const cw = size * (weight === 'bold' ? 0.545 : 0.515);
  const max = Math.max(1, Math.floor(maxW / cw));
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (test.length > max && line) { lines.push(line); line = word; }
      else { line = test; }
    }
    lines.push(line);
  }
  return lines;
}

function boxHeight(o, w) {
  const inner = (w || COL_W) - PAD_X * 2;
  const t = wrap(o.title, o.ts || TITLE_SIZE, 'bold', inner).length;
  const d = o.detail ? wrap(o.detail, o.ds || DET_SIZE, 'reg', inner).length : 0;
  const tlh = (o.ts || TITLE_SIZE) * 1.28;
  const dlh = (o.ds || DET_SIZE) * 1.42;
  return Math.round(PAD_T + t * tlh + (d ? GAP + d * dlh : 0) + PAD_B);
}

// ------------------------------------------------------------------ content -
const CITIZEN = [
  { i: 0, sty: { fill: DARK, stroke: DARK }, tc: '#FFFFFF', dc: '#C3D6EA',
    title: 'Opens AskGov',
    detail: 'From the DG Super App, or any browser on phone, tablet, laptop or desktop. The path is identical on both channels.' },
  { i: 1, sty: BOX, title: 'Asks in Khmer or English',
    detail: 'In their own words. Khmer typed in Latin characters, colloquial names and abbreviations all accepted.' },
  { i: 5, sty: BOX, title: 'Reads the answer',
    detail: 'With its citation block, freshness indicator and the responsible office.' },
  { i: 6, sty: BOX, title: 'Says whether it helped',
    detail: 'Feedback feeds the coverage-gap loop.' },
  { i: 7, sty: { fill: '#F3EFFB', stroke: '#D6C9F0' }, title: 'May ask for a person at any point',
    detail: 'Hands the conversation to a DG Support officer.' },
];

const ROW1 = [
  { i: 0, sty: BOX, title: 'Normalise and interpret',
    detail: 'Khmer segmentation · orthographic variants · synonyms and abbreviations expanded · Latin-typed Khmer · language detected' },
  { i: 1, sty: BOX, title: 'Resolve any follow-up',
    detail: '“And how much does it cost?” is read against the conversation as a question about the service already under discussion.' },
  { i: 2, sty: GATE, title: '◆  Refusal policy screen',
    detail: 'Applied before any retrieval or model call.' },
  { i: 3, sty: GATE, title: '◆  Out-of-domain screen',
    detail: 'Is this about a government service at all?' },
  { i: 4, sty: GATE, title: '◆  Curated answer match?',
    detail: 'Checked against the bank of curated, steward-approved answers.' },
  { i: 5, sty: BOX, title: 'Retrieve over the approved corpus',
    detail: 'Combined keyword and semantic search; candidates fused and re-ranked.' },
  { i: 6, sty: GATE, title: '◆  Confidence gate',
    detail: 'Above the governed retrieval floor? Placed before generation deliberately.' },
];

const OUT1 = [
  { i: 1, sty: { fill: RED, stroke: '#8E2B20' }, tc: '#FFFFFF', dc: '#F6D5D1',
    title: 'EMERGENCY', detail: 'Conversation terminates immediately with verified emergency numbers.' },
  { i: 2, sty: REFUSE, title: 'Refused by policy',
    detail: 'Personal case lookup · legal position · predicted decision · land dispute · individual tax · political question · complaint. Plain explanation, plus an officer.' },
  { i: 3, sty: TERM, title: 'Out of scope — conversation ends',
    detail: 'A plain statement of what AskGov is for, with an example. No officer offered and no officer time consumed.' },
  { i: 4, sty: OK, title: 'YES — serve the curated answer verbatim',
    detail: 'Exactly what a ministry approved. No generation, no retrieval, no verification needed.' },
  { i: 6, sty: REFUSE, title: 'Below the retrieval floor',
    detail: 'No generation at all. States what AskGov does cover and offers an officer.' },
];

const ROW2 = [
  { i: 0, sty: GATE, title: '◆  Topicality gate',
    detail: 'Is the retrieved material actually on the subject asked?' },
  { i: 1, sty: BOX, title: 'Generate the answer',
    detail: 'Composed from the retrieved provisions only, in the citizen’s language, citing the provisions used.' },
  { i: 2, sty: GATE, title: '◆  Verification gate',
    detail: 'Every figure, date, quantity and citation identifier checked against the cited source text.' },
  { i: 3, sty: GATE, title: '◆  Output moderation',
    detail: 'Catches answers that have drifted into advisory territory.' },
  { i: 4, sty: BOX, title: 'Assemble the delivery package',
    detail: 'Citation block · freshness and overdue-review notice · office name, address, hours, contact and map link from the verified directory · ordered steps · statutory deadlines' },
  { i: 5, sty: OK, title: 'Deliver the answer',
    detail: 'Only now does it reach the citizen.' },
  { i: 6, sty: BOX, title: 'Record in the redacted audit log',
    detail: 'Every interaction recorded, personal data redacted before storage.' },
];

const OUT2 = [
  { i: 0, sty: REFUSE, title: 'Off subject',
    detail: 'Withheld, or captioned honestly about what the source does and does not say.' },
  { i: 2, sty: REFUSE, title: 'Unsupported figure or citation',
    detail: 'The answer is suppressed rather than shown — a fabricated number cannot reach a citizen even when a model produces one.' },
  { i: 3, sty: REFUSE, title: 'Advisory drift',
    detail: 'The answer is withheld and an officer offered instead.' },
];

const OFF = [
  { i: 4, sty: { fill: PUR, stroke: PUR }, tc: '#FFFFFF', dc: '#DCD1F5',
    title: 'Hand over to a DG Support officer',
    detail: 'Question and conversation context passed by reference, personal data redacted before storage. The citizen does not explain themselves twice.' },
  { i: 5, sty: OFFICER, title: 'Answers the citizen',
    detail: 'Human capacity moves to the cases that genuinely need judgement.' },
  { i: 6, sty: OFFICER, title: 'Records the outcome',
    detail: 'Outcomes feed demand and coverage evidence back to the institution.' },
];

const TRACK_A = [
  { i: 0, title: 'Registry of official government websites', detail: 'The defined set of sources AskGov watches.' },
  { i: 1, title: 'Scheduled monitoring service', detail: 'Honours each host’s published crawling rules and identifies DGC with a working contact address.' },
  { i: 2, title: 'New or changed content detected', detail: 'Previous content, new content and the retrieval timestamp all retained.' },
  { i: 3, title: 'Classified factual or presentational', detail: 'Classification routes and prioritises. It never authorises publication.' },
  { i: 4, title: 'Steward review queue', detail: 'Raised to the accountable steward for the institution.' },
  { i: 5, title: 'Designated steward approves', detail: 'Versioning, supersession, withdrawal and review scheduling, with a full history of who approved what and when.' },
].map(o => ({ ...o, sty: CONTENT }));

const TRACK_B = [
  { i: 0, title: 'Procedures with no published source', detail: 'Services today navigable only through an intermediary.' },
  { i: 1, title: 'Prioritisation', detail: 'By citizen demand and by the harm of getting it wrong.' },
  { i: 2, title: 'Signed instrument with the institution', detail: 'Content supply survives changes of personnel and does not depend on goodwill.' },
  { i: 3, title: 'Joint working sessions', detail: 'With the officers who actually perform the procedure.' },
  { i: 4, title: 'Collect the source material', detail: 'Internal circulars, service standards, counter notices and forms.' },
  { i: 5, title: 'Draft a plain-Khmer procedural description', detail: 'Written for the citizen who has to follow it.' },
  { i: 6, title: 'Legal review, then formal steward approval', detail: 'Reviewed against the governing instrument.' },
  { i: 7, title: 'Publish in AskGov and return to the institution', detail: 'For publication on its own channels, so the programme increases public information generally.' },
].map(o => ({ ...o, sty: CONTENT }));

const TRACK_C = [
  { i: 0, title: 'Questions AskGov could not answer', detail: 'Together with negative feedback from citizens.' },
  { i: 1, title: 'Aggregated into coverage-gap reports', detail: 'What citizens ask, set against what the government publishes.' },
  { i: 2, title: 'Returned to the responsible institution', detail: 'Content and service improvement becomes evidence-led.' },
  { i: 3, title: 'New or corrected content', detail: 'Re-enters the steward review queue in Track A.' },
].map(o => ({ ...o, sty: CONTENT }));

// ------------------------------------------------------------ row geometry --
const ROWS = {
  cz:  { y: 190,  items: CITIZEN },
  r1:  { y: 478,  items: ROW1 },
  o1:  { y: 662,  items: OUT1 },
  r2:  { y: 862,  items: ROW2 },
  o2:  { y: 1054, items: OUT2 },
  of:  { y: 1310, items: OFF },
  ctA: { y: 1548, items: TRACK_A },
  ctB: { y: 1706, items: TRACK_B },
  ctC: { y: 1864, items: TRACK_C },
};
for (const k of Object.keys(ROWS)) {
  const r = ROWS[k];
  r.h = Math.max(...r.items.map(o => boxHeight(o)));
  r.bottom = r.y + r.h;
  r.mid = r.y + r.h / 2;
}
const CORPUS = { x: X0, y: 2020, w: 3300, h: 120 };

// --------------------------------------------------------------- svg output -
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [];
const p = s => out.push(s);

function textBlock(x, y, lines, size, lh, weight, color) {
  const parts = [];
  lines.forEach((ln, k) => {
    parts.push(`<tspan x="${x}" y="${(y + lh * 0.78 + k * lh).toFixed(1)}">${esc(ln)}</tspan>`);
  });
  return `<text font-family="Inter, Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight === 'bold' ? 600 : 400}" fill="${color}">${parts.join('')}</text>`;
}

function drawBox(o, x, y, w, h) {
  const inner = w - PAD_X * 2;
  const tLines = wrap(o.title, o.ts || TITLE_SIZE, 'bold', inner);
  const tlh = (o.ts || TITLE_SIZE) * 1.28;
  p(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${o.sty.fill}" stroke="${o.sty.stroke}" stroke-width="2"/>`);
  p(textBlock(x + PAD_X, y + PAD_T, tLines, o.ts || TITLE_SIZE, tlh, 'bold', o.tc || INK));
  if (o.detail) {
    const dLines = wrap(o.detail, o.ds || DET_SIZE, 'reg', inner);
    const dlh = (o.ds || DET_SIZE) * 1.42;
    p(textBlock(x + PAD_X, y + PAD_T + tLines.length * tlh + GAP, dLines, o.ds || DET_SIZE, dlh, 'reg', o.dc || MUTED));
  }
}

function arrow(pts, color, opts = {}) {
  const d = pts.map(q => q.join(',')).join(' ');
  const marker = opts.noCap ? '' : ` marker-end="url(#ah-${color.slice(1)})"`;
  const dash = opts.dash ? ' stroke-dasharray="12 9"' : '';
  p(`<polyline points="${d}" fill="none" stroke="${color}" stroke-width="${opts.w || 3}" stroke-linejoin="round" stroke-linecap="butt"${dash}${marker}/>`);
}

function label(txt, x, y, color, size = 11, anchor = 'start') {
  p(`<text x="${x}" y="${y}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" letter-spacing="0.3" fill="${color}" text-anchor="${anchor}">${esc(txt)}</text>`);
}

// --- header, lanes ---------------------------------------------------------
const MARKER_COLORS = [...new Set([NAV, DARK, RED, GRN, PUR, GRY])];
p(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter, Arial, Helvetica, sans-serif">`);
p('<defs>');
for (const c of MARKER_COLORS) {
  p(`<marker id="ah-${c.slice(1)}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" fill="${c}"/></marker>`);
}
p('</defs>');
p(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);

p(`<text x="40" y="72" font-size="46" font-weight="700" fill="${INK}">2.1.2 Future Process (To-Be)</text>`);
p(`<text x="40" y="112" font-size="23" fill="${MUTED}">One authoritative entry point, in Khmer and English — every answer restricted to approved government sources, shown with its citation, and refused rather than guessed.</text>`);

const LANES = [
  { n: 'CITIZEN', s: 'Khmer or English · phone, tablet, laptop or desktop', y: 150, h: 268, accent: NAV },
  { n: 'ANSWER ENGINE', s: 'Governed pipeline — refuses rather than guesses', y: 430, h: 828, accent: NAV },
  { n: 'DG SUPPORT OFFICER', s: 'Human fallback, always offered', y: 1270, h: 218, accent: PUR },
  { n: 'CONTENT & STEWARDSHIP', s: 'Runs continuously behind the service', y: 1500, h: 728, accent: GRN },
];
for (const L of LANES) {
  p(`<rect x="30" y="${L.y}" width="${W - 60}" height="${L.h}" rx="14" fill="${LANE_FILL}" stroke="${LANE_EDGE}" stroke-width="2"/>`);
  const nl = wrap(L.n, 24, 'bold', 230);
  p(`<text font-size="24" font-weight="700" fill="${L.accent}" letter-spacing="2.4">${nl.map((ln, k) => `<tspan x="56" y="${L.y + 48 + k * 30}">${esc(ln)}</tspan>`).join('')}</text>`);
  p(textBlock(56, L.y + 34 + nl.length * 30, wrap(L.s, 16, 'reg', 220), 16, 21, 'reg', LANE_LABEL));
}

// --- content-track captions -------------------------------------------------
label('TRACK A  ·  ACQUISITION FROM PUBLISHED SOURCES', X0, 1536, '#1E6B45', 13);
label('TRACK B  ·  ACQUISITION OF WHAT HAS NEVER BEEN PUBLISHED   (BRD §2.6)', X0, 1694, '#1E6B45', 13);
label('TRACK C  ·  COVERAGE-GAP LOOP', X0, 1852, '#1E6B45', 13);

// --- arrows (drawn under the boxes so they tuck behind the rounded corners) --
const A = [];
// citizen entry
A.push([[[C(0) + COL_W, ROWS.cz.mid], [C(1), ROWS.cz.mid]], NAV, {}]);
A.push([[[CX(1), ROWS.cz.bottom], [CX(1), 390], [CX(0), 390], [CX(0), ROWS.r1.y]], NAV, {}]);
// engine row 1 chain
for (let i = 0; i < 6; i++) A.push([[[C(i) + COL_W, ROWS.r1.mid], [C(i + 1), ROWS.r1.mid]], NAV, {}]);
// wrap row 1 -> row 2
A.push([[[C(6) + COL_W, ROWS.r1.mid], [3300, ROWS.r1.mid], [3300, 818], [CX(0), 818], [CX(0), ROWS.r2.y]], NAV, {}]);
// engine row 2 chain
for (let i = 0; i < 6; i++) A.push([[[C(i) + COL_W, ROWS.r2.mid], [C(i + 1), ROWS.r2.mid]], NAV, {}]);
// deliver -> citizen reads
A.push([[[CX(5) + 120, ROWS.r2.y], [CX(5) + 120, 845], [2790, 845], [2790, 350], [CX(5), 350], [CX(5), ROWS.cz.bottom]], GRN, {}]);
A.push([[[C(5) + COL_W, ROWS.cz.mid], [C(6), ROWS.cz.mid]], NAV, {}]);
A.push([[[C(6) + COL_W, ROWS.cz.mid], [C(7), ROWS.cz.mid]], NAV, {}]);
// citizen asks for a person -> officer
A.push([[[3500, ROWS.cz.bottom], [3500, 1270], [2250, 1270], [2250, ROWS.of.y]], PUR, {}]);
// gate branches out of row 1
A.push([[[CX(2) - 120, ROWS.r1.bottom], [CX(2) - 120, 626], [CX(1), 626], [CX(1), ROWS.o1.y]], RED, {}]);
A.push([[[CX(2) + 60, ROWS.r1.bottom], [CX(2) + 60, ROWS.o1.y]], RED, {}]);
A.push([[[CX(3), ROWS.r1.bottom], [CX(3), ROWS.o1.y]], GRY, {}]);
A.push([[[CX(4), ROWS.r1.bottom], [CX(4), ROWS.o1.y]], GRN, {}]);
A.push([[[CX(6), ROWS.r1.bottom], [CX(6), ROWS.o1.y]], RED, {}]);
// gate branches out of row 2
A.push([[[CX(0), ROWS.r2.bottom], [CX(0), ROWS.o2.y]], RED, {}]);
A.push([[[CX(2), ROWS.r2.bottom], [CX(2), ROWS.o2.y]], RED, {}]);
A.push([[[CX(3), ROWS.r2.bottom], [CX(3), ROWS.o2.y]], RED, {}]);
// curated bypass straight into the delivery package
A.push([[[CX(4), ROWS.o1.bottom], [CX(4), ROWS.r2.y]], GRN, {}]);
// refusal bus -> officer handover
const BUS = 1230;
A.push([[[CX(0), ROWS.o2.bottom], [CX(0), BUS], [2100, BUS], [2100, ROWS.of.y]], RED, {}]);
A.push([[[CX(2), ROWS.o2.bottom], [CX(2), BUS]], RED, { noCap: true }]);
A.push([[[CX(3), ROWS.o2.bottom], [CX(3), BUS]], RED, { noCap: true }]);
A.push([[[C(2) + COL_W, ROWS.o1.mid], [1530, ROWS.o1.mid], [1530, BUS]], RED, { noCap: true }]);
A.push([[[C(6) + COL_W, ROWS.o1.mid], [3210, ROWS.o1.mid], [3210, BUS], [2100, BUS]], RED, { noCap: true }]);
// officer chain
A.push([[[C(4) + COL_W, ROWS.of.mid], [C(5), ROWS.of.mid]], PUR, {}]);
A.push([[[C(5) + COL_W, ROWS.of.mid], [C(6), ROWS.of.mid]], PUR, {}]);
// content tracks
for (let i = 0; i < 5; i++) A.push([[[C(i) + COL_W, ROWS.ctA.mid], [C(i + 1), ROWS.ctA.mid]], GRN, {}]);
for (let i = 0; i < 7; i++) A.push([[[C(i) + COL_W, ROWS.ctB.mid], [C(i + 1), ROWS.ctB.mid]], GRN, {}]);
for (let i = 0; i < 3; i++) A.push([[[C(i) + COL_W, ROWS.ctC.mid], [C(i + 1), ROWS.ctC.mid]], GRN, {}]);
A.push([[[C(5) + COL_W, ROWS.ctA.mid], [2790, ROWS.ctA.mid], [2790, CORPUS.y]], GRN, {}]);
A.push([[[CX(7), ROWS.ctB.bottom], [CX(7), CORPUS.y]], GRN, {}]);
A.push([[[C(3) + COL_W, ROWS.ctC.mid], [1950, ROWS.ctC.mid], [1950, 1690], [CX(4), 1690], [CX(4), ROWS.ctA.bottom]], GRN, {}]);
// corpus feeds retrieval
A.push([[[CORPUS.x + CORPUS.w, CORPUS.y + CORPUS.h / 2], [3660, CORPUS.y + CORPUS.h / 2], [3660, 452], [CX(5), 452], [CX(5), ROWS.r1.y]], DARK, { dash: true, w: 3.5 }]);
for (const a of A) arrow(a[0], a[1], a[2]);

// --- boxes -----------------------------------------------------------------
for (const key of ['cz', 'r1', 'o1', 'r2', 'o2', 'of', 'ctA', 'ctB', 'ctC']) {
  const r = ROWS[key];
  for (const o of r.items) drawBox(o, C(o.i), r.y, COL_W, r.h);
}
drawBox({
  sty: { fill: DARK, stroke: DARK }, tc: '#FFFFFF', dc: '#C3D6EA', ts: 22, ds: 13.5,
  title: 'APPROVED CORPUS  —  the only source AskGov may answer from',
  detail: 'Nothing reaches a citizen without a designated steward’s approval, under any classification and from any source. No content ever auto-publishes; publication remains a human act under all conditions.',
}, CORPUS.x, CORPUS.y, CORPUS.w, CORPUS.h);

// --- branch labels ----------------------------------------------------------
label('EMERGENCY', CX(1) + 16, 646, RED);
label('POLICY HIT', CX(2) + 72, 620, RED);
label('NOT A SERVICE QUESTION', CX(3) + 12, 620, GRY);
label('YES', CX(4) + 12, 620, GRN);
label('NO', C(5) - 50, ROWS.r1.mid - 10, NAV);
label('BELOW FLOOR', CX(6) + 12, 620, RED);
label('OFF SUBJECT', CX(0) + 12, 1022, RED);
label('FAILS CHECK', CX(2) + 12, 1022, RED);
label('DRIFT', CX(3) + 12, 1022, RED);
label('EVERY REFUSAL ENDS IN AN OFFICER OR A NAMED OFFICE', 2130, BUS - 14, RED);
label('CURATED', CX(4) + 12, 843, GRN);
label('THE ONLY SOURCE AskGov MAY ANSWER FROM', CX(5) + 20, 444, DARK);

// --- legend -----------------------------------------------------------------
const LEG = [
  ['Process step', BOX.fill, BOX.stroke],
  ['◆  Governed gate', GATE.fill, GATE.stroke],
  ['Refusal — always ends in an officer', REFUSE.fill, REFUSE.stroke],
  ['Approved / curated content', OK.fill, OK.stroke],
  ['Terminates — no officer', TERM.fill, TERM.stroke],
];
let lx = X0;
for (const [txt, fill, stroke] of LEG) {
  p(`<rect x="${lx}" y="2246" width="22" height="16" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);
  p(textBlock(lx + 30, 2244, [txt], 13, 17, 'reg', MUTED));
  lx += 30 + txt.length * 7.2 + 44;
}
p(textBlock(2980, 2244, ['Publication remains a human act under all conditions.'], 13, 17, 'bold', MUTED));
p('</svg>');

const dest = path.join(__dirname, 'askgov-tobe-process-flow.svg');
fs.writeFileSync(dest, out.join('\n'), 'utf8');
console.log('wrote', dest);
console.log('rows', Object.fromEntries(Object.entries(ROWS).map(([k, r]) => [k, [r.y, r.h, r.bottom]])));
console.log('arrows', A.length);
