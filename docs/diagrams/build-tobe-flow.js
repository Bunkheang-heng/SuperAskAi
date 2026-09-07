/*
 * AskGov Phase 1 — To-Be Process Flow  (BRD §2.1.2)
 *
 *   node docs/diagrams/build-tobe-flow.js
 *
 * Output: askgov-tobe-process-flow.svg
 *
 * Four horizontal swimlanes: Citizen · AskGov Answer Engine · DG Support Officer ·
 * Content & Institutional Stewardship. Rounded rectangles for processes, diamonds
 * for governed decisions, pill terminators for start/end, dashed notes for
 * annotations, dashed arrows for feedback and secondary links. Horizontal channel
 * lines hop over the verticals that cross them, so no two paths ever merge visually.
 *
 * SIZING: every shape is measured from its own text — row heights come from the
 * tallest box in the row, each diamond is sized to the question it holds, and text
 * is vertically centred. Nothing is hand-positioned vertically; edit the copy and
 * the geometry follows. The whole vertical stack is derived in the "geometry" pass.
 *
 * The SVG imports into Figma as editable layers (drag the file onto the canvas)
 * and rasterises for PNG/PDF insertion into the Word BRD.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- palette ---
const NAV = '#0B4F8F';   // primary flow
const RED = '#9B2C2C';   // refusal / withheld
const GRN = '#1E6B45';   // approved content
const PUR = '#5B3BA8';   // human officer
const GRY = '#6E7C8A';   // terminates, no officer
const INK = '#12263A';
const MUTED = '#55636F';
const LANE_FILL = '#F7FAFC', LANE_EDGE = '#DCE5ED', LANE_SUB = '#8492A0';

const S = {
  base:    { fill: '#FFFFFF', stroke: '#C3DAEE' },
  gate:    { fill: '#FFF7E6', stroke: '#E0BF6C' },
  refuse:  { fill: '#FDECEC', stroke: '#E4A9A9' },
  ok:      { fill: '#EAF6EF', stroke: '#94C9AE' },
  term:    { fill: '#EEF1F4', stroke: '#BCC7D1' },
  officer: { fill: '#F7F4FD', stroke: '#C0ADE9' },
  content: { fill: '#FFFFFF', stroke: '#A0D0B7' },
  note:    { fill: '#FBFCFD', stroke: '#B9C6D2', dash: '7 6' },
  navy:    { fill: NAV, stroke: NAV, tc: '#FFFFFF', dc: '#CBDCEC' },
  red:     { fill: RED, stroke: '#7E2020', tc: '#FFFFFF', dc: '#F3CFCF' },
  purple:  { fill: PUR, stroke: '#452C82', tc: '#FFFFFF', dc: '#DBD1F3' },
};

// ------------------------------------------------------------------- grid ---
const W = 3720;
const COL_W = 360, PITCH = 420, X0 = 300;
const X = i => X0 + PITCH * i;          // column left edge
const CX = i => X(i) + COL_W / 2;       // column centre

// --------------------------------------------------------------- type ramp --
const PAD_X = 20, PAD_T = 16, PAD_B = 16, GAP = 8;
// process boxes
const T_S = 17,   T_LH = 21.8,  D_S = 14,   D_LH = 19.9;
// annotation notes
const N_S = 15,   N_LH = 19.2,  ND_S = 13,  ND_LH = 18.5;
// terminators
const M_S = 20,   M_LH = 25.6,  MD_S = 14,  MD_LH = 19.9;
// decision diamonds
const K_S = 16,   K_LH = 20.5,  KD_S = 12,  KD_LH = 16.3;
const DEC_TW = 230;                      // text column inside a diamond
const DEC_MIN = 150;

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

// Type sizes for a cell, by kind.
function ramp(k) {
  if (k === 'dec')  return { ts: K_S, tlh: K_LH, ds: KD_S, dlh: KD_LH, w: DEC_TW,          mid: true };
  if (k === 'term') return { ts: M_S, tlh: M_LH, ds: MD_S, dlh: MD_LH, w: COL_W - 56,      mid: true };
  if (k === 'note') return { ts: N_S, tlh: N_LH, ds: ND_S, dlh: ND_LH, w: COL_W - PAD_X * 2 };
  return { ts: T_S, tlh: T_LH, ds: D_S, dlh: D_LH, w: COL_W - PAD_X * 2 };
}

// The stacked text block for a cell: wrapped lines plus its total height.
function block(o) {
  const r = ramp(o.k);
  const tl = wrap(o.t, r.ts, 'bold', r.w);
  const dl = o.d ? wrap(o.d, r.ds, 'reg', r.w) : [];
  const h = tl.length * r.tlh + (dl.length ? GAP + dl.length * r.dlh : 0);
  return { r, tl, dl, h };
}

// A diamond is sized so its text column clears the sloping edges.
function shapeHeight(o) {
  const b = block(o);
  if (o.k === 'dec') {
    const factor = 1 - (DEC_TW / 2) / (COL_W / 2);      // usable height fraction at text width
    return Math.max(DEC_MIN, Math.ceil((b.h / factor) / 2) * 2 + 14);
  }
  return Math.ceil(PAD_T + b.h + PAD_B);
}

// ------------------------------------------------------------------ content -
// k: proc | dec | term | note        r: style role
const ROWS = {

cz: [
  { i: 0, k: 'term', r: 'navy', t: 'START',
    d: 'A citizen needs a government service.' },
  { i: 1, k: 'proc', r: 'base', t: 'Opens AskGov',
    d: 'From the DG Super App, or a web browser on phone, tablet, laptop or desktop. The path is identical on every channel.' },
  { i: 2, k: 'proc', r: 'base', t: 'Asks in Khmer or English',
    d: 'Natural language, in their own words. Khmer typed in Latin characters, colloquial service names and abbreviations all accepted.' },
  { i: 4, k: 'note', r: 'note', t: 'Receives one of five outcomes',
    d: 'Answer with citations and freshness status · emergency information · refusal explanation · out-of-domain explanation · a human officer.' },
  { i: 5, k: 'proc', r: 'base', t: 'Reads answer',
    d: 'With its citation block, freshness indicator and the responsible office.' },
  { i: 6, k: 'proc', r: 'base', t: 'Gives feedback',
    d: 'Says whether the answer helped. Feedback feeds the coverage-gap loop.' },
  { i: 7, k: 'proc', r: 'officer', t: 'Requests a human officer',
    d: 'Available at any point in the conversation. Hands the conversation to a DG Support officer.' },
],

r1: [
  { i: 0, k: 'proc', r: 'base', t: 'Receive citizen question',
    d: 'Entry to the governed pipeline.' },
  { i: 1, k: 'proc', r: 'base', t: 'Normalise and interpret question',
    d: 'Khmer orthographic variants · Khmer text segmentation · synonym and abbreviation expansion · colloquial government service names · Khmer typed in Latin characters · follow-up question resolution · language detection' },
  { i: 2, k: 'dec', r: 'gate', t: 'Does the question match the refusal policy?',
    d: 'Screened before retrieval' },
  { i: 3, k: 'dec', r: 'gate', t: 'Is this a government service question?',
    d: 'Out-of-domain screen' },
  { i: 4, k: 'dec', r: 'gate', t: 'Curated answer found?',
    d: 'Steward-approved answer bank' },
  { i: 5, k: 'proc', r: 'base', t: 'Retrieve candidates from approved corpus',
    d: 'Keyword search · semantic search · fusion · re-ranking. Candidates only — nothing is generated at this stage.' },
  { i: 6, k: 'dec', r: 'gate', t: 'Retrieval confidence above governed floor?',
    d: 'Checked before generation' },
],

o1: [
  { i: 1, k: 'proc', r: 'red', t: 'EMERGENCY',
    d: 'Verified emergency numbers shown. The conversation terminates immediately.' },
  { i: 2, k: 'proc', r: 'refuse', t: 'Policy-restricted — explain why AskGov cannot answer',
    d: 'Personal case lookup · legal-position questions · predictions of official decisions · land disputes · individual tax computation · political questions · complaint intake. A human officer is offered.' },
  { i: 3, k: 'proc', r: 'term', t: 'Out of domain — explain AskGov’s scope',
    d: 'A plain statement of what AskGov is for, with an example of what it can help with. No officer is offered and no officer time is consumed.' },
  { i: 4, k: 'proc', r: 'ok', t: 'Serve approved answer verbatim',
    d: 'Exactly what a steward approved. No retrieval, no generation and no verification needed.' },
  { i: 6, k: 'proc', r: 'refuse', t: 'Below the floor — do not generate',
    d: 'Nothing is generated. AskGov explains what it can cover, and offers a human officer.' },
],

r2: [
  { i: 0, k: 'dec', r: 'gate', t: 'Are the retrieved sources on-topic?',
    d: 'Topicality gate' },
  { i: 1, k: 'proc', r: 'base', t: 'Generate answer from retrieved approved sources only',
    d: 'No generation beyond the approved retrieved provisions. Composed in the citizen’s language, citing the provisions used.' },
  { i: 2, k: 'dec', r: 'gate', t: 'All information supported by cited source text?',
    d: 'Figures · dates · citations' },
  { i: 3, k: 'dec', r: 'gate', t: 'Passes final output moderation?',
    d: 'Stops advisory drift' },
  { i: 4, k: 'proc', r: 'base', t: 'Assemble the delivery package',
    d: 'Citation block · freshness indicator · overdue-review notice · ordered procedure steps · required documents · fees · responsible office, address, opening hours, contact number and map link' },
  { i: 5, k: 'proc', r: 'ok', t: 'Deliver final answer',
    d: 'In the citizen’s language. Only now does it reach the citizen.' },
  { i: 6, k: 'proc', r: 'base', t: 'Record in redacted audit log',
    d: 'Every interaction recorded. Citizen data redacted before storage.' },
],

o2: [
  { i: 0, k: 'proc', r: 'refuse', t: 'Withhold answer or caption its limitations',
    d: 'Withheld, or captioned about what the source does and does not say. Human support offered where applicable.' },
  { i: 2, k: 'proc', r: 'refuse', t: 'Suppress answer',
    d: 'Suppressed rather than shown — an unsupported figure or citation cannot reach a citizen, even when a model produces one. An officer is offered.' },
  { i: 3, k: 'proc', r: 'refuse', t: 'Advisory drift — withhold',
    d: 'The answer is withheld and a human officer is offered instead.' },
],

of: [
  { i: 3, k: 'proc', r: 'purple', t: 'Receive escalated question and context by reference',
    d: 'The question and the whole conversation arrive with the officer. The citizen does not explain the issue again.' },
  { i: 4, k: 'proc', r: 'officer', t: 'Citizen data redacted before storage',
    d: 'Redaction happens before anything is written down.' },
  { i: 5, k: 'proc', r: 'officer', t: 'Officer answers citizen',
    d: 'Human capacity moves to the cases that genuinely need judgement.' },
  { i: 6, k: 'proc', r: 'officer', t: 'Record outcome',
    d: 'Outcomes feed demand and coverage evidence back to the institution.' },
],

ctA: [
  { i: 0, k: 'proc', r: 'content', t: 'Official government website registry',
    d: 'The defined set of published sources AskGov watches.' },
  { i: 1, k: 'proc', r: 'content', t: 'Scheduled monitoring service',
    d: 'Honours each host’s published crawling rules and identifies itself with a working contact address.' },
  { i: 2, k: 'proc', r: 'content', t: 'New or changed content detected',
    d: 'Detection only. Nothing enters the corpus at this point.' },
  { i: 3, k: 'proc', r: 'content', t: 'Classify change',
    d: 'Factual or presentational. Classification routes and prioritises — it never authorises publication.' },
  { i: 4, k: 'proc', r: 'content', t: 'Retain previous version, new version and timestamp',
    d: 'Full version history preserved for audit.' },
  { i: 5, k: 'proc', r: 'content', t: 'Route to accountable steward review queue',
    d: 'Raised to the steward accountable for that institution.' },
  { i: 6, k: 'dec', r: 'gate', t: 'Steward review — approved?',
    d: 'Publication is a human act' },
  { i: 7, k: 'proc', r: 'refuse', t: 'Do not publish',
    d: 'Held. The previously approved version continues to stand.' },
],

ctB: [
  { i: 0, k: 'proc', r: 'content', t: 'Identify unpublished procedure',
    d: 'Procedures that have never been published anywhere.' },
  { i: 1, k: 'proc', r: 'content', t: 'Prioritisation',
    d: 'By citizen demand, and by the harm of getting it wrong.' },
  { i: 2, k: 'proc', r: 'content', t: 'MoU / institutional engagement',
    d: 'A signed instrument, so content supply survives changes of personnel.' },
  { i: 3, k: 'proc', r: 'content', t: 'Joint working sessions with officers',
    d: 'With the officers who actually perform the procedure.' },
  { i: 4, k: 'proc', r: 'content', t: 'Collect source material',
    d: 'Internal circulars · service standards · counter notices · forms' },
  { i: 5, k: 'proc', r: 'content', t: 'Draft plain-Khmer procedural description',
    d: 'Written for the citizen who has to follow it.' },
  { i: 6, k: 'proc', r: 'content', t: 'Legal review, then steward approval',
    d: 'Reviewed against the governing instrument, then formally approved.' },
  { i: 7, k: 'proc', r: 'content', t: 'Publish in AskGov, return to the institution',
    d: 'For publication on the institution’s own channels, so the programme increases public information generally.' },
],

ctC: [
  { i: 0, k: 'proc', r: 'content', t: 'Unanswered questions and negative feedback',
    d: 'Questions AskGov could not answer, with feedback from citizens.' },
  { i: 1, k: 'proc', r: 'content', t: 'Coverage-gap report',
    d: 'What citizens ask, set against what the government publishes.' },
  { i: 2, k: 'proc', r: 'content', t: 'Responsible institution',
    d: 'Returned to the institution accountable for the service.' },
  { i: 3, k: 'proc', r: 'content', t: 'Institutional content action',
    d: 'Content and service improvement becomes evidence-led.' },
  { i: 4, k: 'proc', r: 'content', t: 'New or improved content',
    d: 'Re-enters the steward review queue in Track A.' },
],

};

// ================================================================= geometry ==
// Measure every cell, then stack the rows, lanes and channels from those sizes.
const R = {};
for (const key of Object.keys(ROWS)) {
  let ext = 0;
  for (const o of ROWS[key]) { o._h = shapeHeight(o); ext = Math.max(ext, o._h); }
  R[key] = { ext };
}

let y = 160;
const LANES = [];

// --- lane 1: citizen ---
const LANE1_Y = y;
R.cz.y = y + 52;
const PILL_Y = R.cz.y + R.cz.ext + 18, PILL_H = 46;
const LANE1_H = (PILL_Y + PILL_H + 22) - LANE1_Y;
LANES.push({ n: 'CITIZEN', s: 'Khmer or English · DG Super App or any browser', y: LANE1_Y, h: LANE1_H, a: NAV });

// --- lane 2: answer engine ---
const LANE2_Y = LANE1_Y + LANE1_H + 34;
R.r1.y = LANE2_Y + 44;
const CH_FORK = R.r1.y + R.r1.ext + 42;
R.o1.y = R.r1.y + R.r1.ext + 84;
const END_Y = R.o1.y + R.o1.ext + 20, END_H = 32;
const CH_WRAP = END_Y + END_H + 24;
R.r2.y = CH_WRAP + 36;
R.o2.y = R.r2.y + R.r2.ext + 84;
const CH_R2EXIT = R.r2.y + R.r2.ext + 42;
const LANE2_H = (R.o2.y + R.o2.ext + 60) - LANE2_Y;
LANES.push({ n: 'ASKGOV ANSWER ENGINE', s: 'Governed pipeline — refuses rather than guesses', y: LANE2_Y, h: LANE2_H, a: NAV });

// --- lane 3: officer ---
const CH_BUS = LANE2_Y + LANE2_H + 20;
const LANE3_Y = CH_BUS + 24;
R.of.y = LANE3_Y + 46;
const LANE3_H = (R.of.y + R.of.ext + 46) - LANE3_Y;
LANES.push({ n: 'DG SUPPORT OFFICER', s: 'Human fallback, offered on every refusal', y: LANE3_Y, h: LANE3_H, a: PUR });

// --- lane 4: content & stewardship ---
const LANE4_Y = LANE3_Y + LANE3_H + 32;
R.ctA.y = LANE4_Y + 70;
R.ctB.y = R.ctA.y + R.ctA.ext + 70;
R.ctC.y = R.ctB.y + R.ctB.ext + 80;      // extra room: the Track C inbound connector sits here
const LANE4_H = (R.ctC.y + R.ctC.ext + 44) - LANE4_Y;
LANES.push({ n: 'CONTENT & INSTITUTIONAL STEWARDSHIP', s: 'Runs continuously behind the service', y: LANE4_Y, h: LANE4_H, a: GRN });

for (const k of Object.keys(R)) { R[k].mid = R[k].y + R[k].ext / 2; R[k].bot = R[k].y + R[k].ext; }

// remaining channels, all derived
const CH_CZ    = R.cz.y - 24;                    // citizen "request a human" link
const CZ_UNDER = PILL_Y + PILL_H / 2;            // answer return + end furniture
const CH_ENTRY = LANE1_Y + LANE1_H + 12;         // citizen → engine
const CH_TOP   = LANE1_Y + LANE1_H + 22;         // approved corpus → retrieval
const CH_ANO   = R.ctA.y - 46;                   // steward NO → do not publish
const CAP_OFF  = 26;                             // track caption above its row
const FC_X     = 920;                            // Track C inbound connector, clear of the caption
const CH_CUP   = R.ctA.bot + 26;                 // Track C return, upper leg
const CH_CLOW  = R.ctB.bot + 34;                 // Track C return, lower leg
const RETURN_X = 2790;                           // col5/col6 gutter, answer back to citizen

const CORPUS = { x: X0, y: LANE4_Y + LANE4_H + 38, w: 3300, h: 116 };
const LEG_Y = CORPUS.y + CORPUS.h + 44;
const H = LEG_Y + 58;

// ------------------------------------------------------------------ anchors -
// Every cell is vertically centred on its row, so anchors come off its own shape.
function box(rowKey, i) {
  const row = R[rowKey];
  const o = ROWS[rowKey].find(c => c.i === i);
  const h = o._h, top = row.mid - h / 2;
  return { o, h, top, bot: top + h, x0: X(i), x1: X(i) + COL_W, cx: CX(i), mid: row.mid };
}
const L  = (r, i) => [box(r, i).x0, box(r, i).mid];
const Rr = (r, i) => [box(r, i).x1, box(r, i).mid];
const T  = (r, i) => [box(r, i).cx, box(r, i).top];
const B  = (r, i) => [box(r, i).cx, box(r, i).bot];
const Bx = (r, i, x) => [x, box(r, i).bot];

// ------------------------------------------------------------------- render -
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [];
const p = s => out.push(s);
const n = v => Number(Number(v).toFixed(2));

function textBlock(x, yTop, lines, size, lh, weight, color, anchor) {
  const parts = lines.map((ln, k) =>
    `<tspan x="${n(x)}" y="${n(yTop + lh * 0.78 + k * lh)}">${esc(ln)}</tspan>`);
  return `<text font-size="${size}" font-weight="${weight === 'bold' ? 600 : 400}" fill="${color}"` +
         (anchor ? ` text-anchor="${anchor}"` : '') + `>${parts.join('')}</text>`;
}

function drawCell(rowKey, o) {
  const g = box(rowKey, o.i);
  const st = S[o.r], b = block(o);
  const x = g.x0, yy = g.top, w = COL_W, h = g.h;
  const dash = st.dash ? ` stroke-dasharray="${st.dash}"` : '';

  if (o.k === 'dec') {
    const cx = x + w / 2, cy = yy + h / 2;
    p(`<path d="M ${n(cx)} ${n(yy)} L ${n(x + w)} ${n(cy)} L ${n(cx)} ${n(yy + h)} L ${n(x)} ${n(cy)} Z" ` +
      `fill="${st.fill}" stroke="${st.stroke}" stroke-width="2.5" stroke-linejoin="round"/>`);
  } else if (o.k === 'term') {
    p(`<rect x="${n(x)}" y="${n(yy)}" width="${w}" height="${n(h)}" rx="${n(h / 2)}" ` +
      `fill="${st.fill}" stroke="${st.stroke}" stroke-width="2.5"/>`);
  } else {
    p(`<rect x="${n(x)}" y="${n(yy)}" width="${w}" height="${n(h)}" rx="16" ` +
      `fill="${st.fill}" stroke="${st.stroke}" stroke-width="2.5"${dash}/>`);
  }

  // text block, vertically centred in the shape
  const tc = st.tc || INK, dc = st.dc || MUTED;
  let cur = yy + (h - b.h) / 2;
  const tx = b.r.mid ? x + w / 2 : x + PAD_X;
  const anchor = b.r.mid ? 'middle' : null;
  p(textBlock(tx, cur, b.tl, b.r.ts, b.r.tlh, 'bold', tc, anchor));
  if (b.dl.length) p(textBlock(tx, cur + b.tl.length * b.r.tlh + GAP, b.dl, b.r.ds, b.r.dlh, 'reg', dc, anchor));
}

// --- connectors ---
// Horizontal segments hop over any x in `hops` so crossing lines never merge.
function arrowPath(pts, hops) {
  const r = 9;
  let d = `M ${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    if (y0 === y1 && hops && hops.length) {
      const dir = x1 > x0 ? 1 : -1;
      const hs = hops
        .filter(h => dir > 0 ? (h > x0 + r && h < x1 - r) : (h < x0 - r && h > x1 + r))
        .sort((a, b) => dir > 0 ? a - b : b - a);
      for (const h of hs) {
        d += ` L ${n(h - dir * r)} ${n(y0)}`;
        d += ` A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${n(h + dir * r)} ${n(y0)}`;
      }
    }
    d += ` L ${n(x1)} ${n(y1)}`;
  }
  return d;
}

// Arrowheads are filled paths, not SVG <marker>s: Figma's importer discards
// markers, which would leave every connector headless on the canvas.
function head(from, to, color) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const hl = Math.min(15, len * 0.7), hw = hl * 0.54;
  const bx = to[0] - ux * hl, by = to[1] - uy * hl;
  const px = -uy, py = ux;
  return {
    base: [bx, by],
    svg: `<path d="M ${n(to[0])} ${n(to[1])} L ${n(bx + px * hw)} ${n(by + py * hw)} ` +
         `L ${n(bx - px * hw)} ${n(by - py * hw)} Z" fill="${color}"/>`,
  };
}

const ARROWS = [];
const a = (pts, color, opts = {}) => ARROWS.push([pts, color, opts]);

function drawArrow(pts, color, opts) {
  const pth = pts.map(q => q.slice());
  let cap = '';
  if (!opts.noCap) {
    const h = head(pth[pth.length - 2], pth[pth.length - 1], color);
    pth[pth.length - 1] = h.base;
    cap = h.svg;
  }
  const dash = opts.dash ? ' stroke-dasharray="13 9"' : '';
  p(`<path d="${arrowPath(pth, opts.hops)}" fill="none" stroke="${color}" ` +
    `stroke-width="${opts.w || 3.2}" stroke-linejoin="round" stroke-linecap="butt"${dash}/>`);
  if (cap) p(cap);
}

function label(txt, x, yy, color, anchor = 'start', size = 13) {
  p(`<text x="${n(x)}" y="${n(yy)}" font-size="${size}" font-weight="700" letter-spacing="0.4" ` +
    `fill="${color}" text-anchor="${anchor}">${esc(txt)}</text>`);
}

function connector(cx, cy, letter, color) {
  p(`<circle cx="${n(cx)}" cy="${n(cy)}" r="19" fill="#FFFFFF" stroke="${color}" stroke-width="2.5" stroke-dasharray="6 5"/>`);
  p(`<text x="${n(cx)}" y="${n(cy + 6)}" font-size="17" font-weight="700" fill="${color}" text-anchor="middle">${letter}</text>`);
}

// Pills size themselves to their label so text never spills past the rounded ends.
function pill(cx, yy, h, txt, role, size) {
  const st = S[role], fs = size || 15;
  const w = Math.max(150, Math.round(txt.length * fs * 0.575) + 40);
  const x = cx - w / 2;
  p(`<rect x="${n(x)}" y="${n(yy)}" width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2.5"/>`);
  p(`<text x="${n(cx)}" y="${n(yy + h / 2 + fs * 0.36)}" font-size="${fs}" font-weight="700" fill="${st.tc || INK}" text-anchor="middle">${esc(txt)}</text>`);
}

// ================================================================== document =
p(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ` +
  `font-family="Inter, Arial, Helvetica, sans-serif">`);
p(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);

// --- header ---
p(`<text x="40" y="72" font-size="46" font-weight="700" fill="${INK}">AskGov Phase 1 — To-Be Process Flow</text>`);
p(`<text x="40" y="116" font-size="22" fill="${MUTED}">One authoritative entry point in Khmer and English. Every answer is drawn from approved government sources, shown with its citation and freshness status, and refused rather than guessed.</text>`);
p(`<text x="${W - 40}" y="72" font-size="20" font-weight="600" fill="${LANE_SUB}" text-anchor="end">Business Requirements Document · §2.1.2 Future Process (To-Be)</text>`);

// --- lanes ---
for (const Ln of LANES) {
  p(`<rect x="30" y="${n(Ln.y)}" width="${W - 60}" height="${n(Ln.h)}" rx="16" fill="${LANE_FILL}" stroke="${LANE_EDGE}" stroke-width="2"/>`);
  p(`<rect x="30" y="${n(Ln.y)}" width="7" height="${n(Ln.h)}" fill="${Ln.a}" opacity="0.9"/>`);
  const nl = wrap(Ln.n, 25, 'bold', 218);
  p(`<text font-size="25" font-weight="700" fill="${Ln.a}" letter-spacing="1.6">` +
    nl.map((ln, k) => `<tspan x="62" y="${n(Ln.y + 52 + k * 31)}">${esc(ln)}</tspan>`).join('') + `</text>`);
  p(textBlock(62, Ln.y + 38 + nl.length * 31, wrap(Ln.s, 16, 'reg', 218), 16, 21, 'reg', LANE_SUB));
}

// --- track captions ---
label('TRACK A  ·  ACQUISITION FROM PUBLISHED GOVERNMENT SOURCES', X0, R.ctA.y - CAP_OFF, GRN, 'start', 14);
label('TRACK B  ·  PROCEDURES THAT HAVE NEVER BEEN PUBLISHED', X0, R.ctB.y - CAP_OFF, GRN, 'start', 14);
label('TRACK C  ·  FEEDBACK AND CONTINUOUS IMPROVEMENT LOOP', X0, R.ctC.y - CAP_OFF, GRN, 'start', 14);

// ==================================================================== arrows =
const WRAP_HOPS = [3210, RETURN_X, 2160, 1530];

// citizen
a([Rr('cz', 0), L('cz', 1)], NAV);
a([Rr('cz', 1), L('cz', 2)], NAV);
a([B('cz', 2), [CX(2), CH_ENTRY], [CX(0), CH_ENTRY], T('r1', 0)], NAV);
a([T('cz', 2), [CX(2), CH_CZ], [CX(7), CH_CZ], T('cz', 7)], PUR, { dash: true });
a([Rr('cz', 5), L('cz', 6)], NAV);
a([B('cz', 7), [CX(7), CH_BUS]], PUR, { noCap: true });

// answer engine — row 1 chain
for (let i = 0; i < 6; i++) a([Rr('r1', i), L('r1', i + 1)], NAV, i === 4 ? { hops: [RETURN_X] } : {});

// row 1 branches
a([B('r1', 2), [CX(2), CH_FORK], [CX(1), CH_FORK], T('o1', 1)], RED);
a([B('r1', 2), T('o1', 2)], RED);
a([B('r1', 3), T('o1', 3)], GRY);
a([B('r1', 4), T('o1', 4)], GRN);
a([B('r1', 6), T('o1', 6)], RED);

// row 1 → row 2 wrap
a([Rr('r1', 6), [3380, R.r1.mid], [3380, CH_WRAP], [CX(0), CH_WRAP], T('r2', 0)], NAV, { hops: WRAP_HOPS });

// curated bypass, and the two terminating outcomes
a([B('o1', 4), T('r2', 4)], GRN);
a([B('o1', 1), [CX(1), END_Y]], RED);
a([B('o1', 3), [CX(3), END_Y]], GRY);

// row 1 refusals onto the escalation bus
a([Rr('o1', 2), [1530, R.o1.mid], [1530, CH_BUS]], RED, { noCap: true });
a([Rr('o1', 6), [3210, R.o1.mid], [3210, CH_BUS]], RED, { noCap: true });

// answer engine — row 2 chain
for (let i = 0; i < 6; i++) a([Rr('r2', i), L('r2', i + 1)], NAV, i === 5 ? { hops: [RETURN_X] } : {});

// row 2 branches
a([B('r2', 0), T('o2', 0)], RED);
a([B('r2', 2), T('o2', 2)], RED);
a([B('r2', 3), T('o2', 3)], RED);
a([B('o2', 0), [CX(0), CH_BUS]], RED, { noCap: true });
a([B('o2', 2), [CX(2), CH_BUS]], RED, { noCap: true });
a([B('o2', 3), [CX(3), CH_BUS]], RED, { noCap: true });

// delivery back to the citizen, up the col5/col6 gutter
a([Bx('r2', 5, CX(5) + 120), [CX(5) + 120, CH_R2EXIT], [RETURN_X, CH_R2EXIT],
   [RETURN_X, CZ_UNDER], [CX(5), CZ_UNDER], B('cz', 5)], GRN);

// citizen end + feedback connector
a([Bx('cz', 6, CX(6) - 40), [CX(6) - 40, PILL_Y]], NAV);
a([Bx('cz', 6, CX(6) + 130), [CX(6) + 130, CZ_UNDER - 21]], GRN, { dash: true });
a([[FC_X, R.ctC.y - 27], [FC_X, R.ctC.y - 14], [CX(0), R.ctC.y - 14], T('ctC', 0)], GRN, { dash: true });

// escalation bus → officer
a([[CX(0), CH_BUS], [CX(7), CH_BUS]], RED, { noCap: true });
a([[CX(3), CH_BUS], T('of', 3)], PUR);
for (let i = 3; i < 6; i++) a([Rr('of', i), L('of', i + 1)], PUR);

// content & stewardship — track A
for (let i = 0; i < 6; i++) a([Rr('ctA', i), L('ctA', i + 1)], GRN);
a([Rr('ctA', 6), [3210, R.ctA.mid], [3210, CORPUS.y]], GRN);
a([T('ctA', 6), [CX(6), CH_ANO], [CX(7), CH_ANO], T('ctA', 7)], RED);

// track B — hops where the Track A corpus feed and the Track C return cross the chain
for (let i = 0; i < 7; i++) a([Rr('ctB', i), L('ctB', i + 1)], GRN, { hops: [3210, 2370] });
a([B('ctB', 7), [CX(7), CORPUS.y]], GRN);

// track C
for (let i = 0; i < 4; i++) a([Rr('ctC', i), L('ctC', i + 1)], GRN);
a([T('ctC', 4), [CX(4), CH_CLOW], [2370, CH_CLOW], [2370, CH_CUP], [CX(5), CH_CUP], B('ctA', 5)], GRN, { dash: true });

// approved corpus feeds retrieval
a([[CORPUS.x + CORPUS.w, CORPUS.y + CORPUS.h / 2], [3620, CORPUS.y + CORPUS.h / 2],
   [3620, CH_TOP], [CX(5), CH_TOP], T('r1', 5)], GRN, { dash: true, w: 3.5, hops: [CX(7), RETURN_X] });

for (const [pts, c, o] of ARROWS) drawArrow(pts, c, o);

// ===================================================================== boxes =
for (const key of Object.keys(ROWS)) for (const o of ROWS[key]) drawCell(key, o);

pill(CX(6) - 40, PILL_Y, PILL_H, 'END', 'term', 17);
pill(CX(1), END_Y, END_H, 'END — CONVERSATION TERMINATES', 'red', 13);
pill(CX(3), END_Y, END_H, 'END — NO OFFICER OFFERED', 'term', 13);
connector(CX(6) + 130, CZ_UNDER, 'F', GRN);
connector(FC_X, R.ctC.y - 46, 'F', GRN);

// approved corpus
p(`<rect x="${CORPUS.x}" y="${n(CORPUS.y)}" width="${CORPUS.w}" height="${CORPUS.h}" rx="16" fill="${NAV}" stroke="${NAV}" stroke-width="2.5"/>`);
p(textBlock(CORPUS.x + 28, CORPUS.y + 18, wrap('APPROVED CORPUS  —  the only source AskGov may answer from', 24, 'bold', CORPUS.w - 56), 24, 30, 'bold', '#FFFFFF'));
p(textBlock(CORPUS.x + 28, CORPUS.y + 58, wrap('Nothing reaches a citizen without a designated steward’s approval, under any classification and from any source. Content never auto-publishes — publication remains a human act under all conditions.', 15, 'reg', CORPUS.w - 56), 15, 21, 'reg', '#CBDCEC'));

// ==================================================================== labels =
const gut = i => (X(i) + COL_W + X(i + 1)) / 2;
label('NO',  gut(2), R.r1.mid - 15, NAV, 'middle');
label('YES', gut(3), R.r1.mid - 15, NAV, 'middle');
label('NO',  gut(4), R.r1.mid - 15, NAV, 'middle');
label('YES', gut(6) - 20, R.r1.mid - 15, NAV, 'middle');
label('YES', gut(0), R.r2.mid - 15, NAV, 'middle');
label('YES', gut(2), R.r2.mid - 15, NAV, 'middle');
label('YES', gut(3), R.r2.mid - 15, NAV, 'middle');

const bl = (t, i, row, col) => label(t, CX(i) + 14, box(row, i).bot + 26, col);
bl('YES — POLICY HIT', 2, 'r1', RED);
bl('NO — OUT OF DOMAIN', 3, 'r1', GRY);
bl('YES — CURATED', 4, 'r1', GRN);
bl('NO — BELOW FLOOR', 6, 'r1', RED);
bl('NO — OFF TOPIC', 0, 'r2', RED);
bl('NO — UNSUPPORTED', 2, 'r2', RED);
bl('NO — ADVISORY DRIFT', 3, 'r2', RED);
label('YES — EMERGENCY', CX(1) + 14, CH_FORK - 12, RED);

label('EVERY REFUSAL ENDS WITH A HUMAN OFFICER  —  CONVERSATION CONTEXT PASSED BY REFERENCE, SO THE CITIZEN NEVER EXPLAINS THE ISSUE AGAIN', CX(3) + 32, CH_BUS - 14, RED);
label('CITIZEN REQUESTS A HUMAN', CX(7) - 14, CH_TOP + 26, PUR, 'end');
label('APPROVED ANSWER RETURNED TO THE CITIZEN', CX(5) - 14, CZ_UNDER - 14, GRN, 'end');
label('THE ONLY SOURCE ASKGOV MAY ANSWER FROM', RETURN_X - 32, CH_TOP - 14, GRN, 'end');
label('YES — APPROVED', 3196, R.ctA.bot + 26, GRN, 'end');
label('NO', CX(6) + 16, CH_ANO - 12, RED);
label('NEW OR IMPROVED CONTENT RE-ENTERS STEWARD REVIEW', CX(5) + 14, CH_CUP - 12, GRN);
label('TO COVERAGE-GAP LOOP', CX(6) + 156, CZ_UNDER + 5, GRN);

// ==================================================================== legend =
const LEG = [
  { k: 'proc', r: 'base',    t: 'Process step' },
  { k: 'dec',  r: 'gate',    t: 'Governed decision' },
  { k: 'term', r: 'term',    t: 'Start / end terminator' },
  { k: 'proc', r: 'refuse',  t: 'Refusal, suppression or withholding' },
  { k: 'proc', r: 'ok',      t: 'Approved or curated content' },
  { k: 'proc', r: 'officer', t: 'Human officer path' },
  { k: 'proc', r: 'note',    t: 'Annotation' },
];
let lx = X0;
for (const it of LEG) {
  const st = S[it.r];
  if (it.k === 'dec') {
    p(`<path d="M ${lx + 17} ${LEG_Y} L ${lx + 34} ${LEG_Y + 11} L ${lx + 17} ${LEG_Y + 22} L ${lx} ${LEG_Y + 11} Z" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`);
  } else {
    p(`<rect x="${lx}" y="${LEG_Y + 1}" width="34" height="20" rx="${it.k === 'term' ? 10 : 6}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}/>`);
  }
  p(textBlock(lx + 46, LEG_Y - 2, [it.t], 14, 18, 'reg', MUTED));
  lx += 46 + it.t.length * 7.7 + 44;
}
function legendArrow(x, yy, color, dashed) {
  const h = head([x, yy], [x + 50, yy], color);
  p(`<path d="M ${x} ${yy} L ${n(h.base[0])} ${yy}" stroke="${color}" stroke-width="3.2"` +
    (dashed ? ' stroke-dasharray="13 9"' : '') + `/>`);
  p(h.svg);
}
legendArrow(lx, LEG_Y + 11, NAV, false);
p(textBlock(lx + 60, LEG_Y - 2, ['Primary flow'], 14, 18, 'reg', MUTED));
lx += 60 + 'Primary flow'.length * 7.7 + 44;
legendArrow(lx, LEG_Y + 11, GRN, true);
p(textBlock(lx + 60, LEG_Y - 2, ['Feedback or secondary link'], 14, 18, 'reg', MUTED));
lx += 60 + 'Feedback or secondary link'.length * 7.7 + 44;
connector(lx + 19, LEG_Y + 11, 'F', GRN);
p(textBlock(lx + 48, LEG_Y - 2, ['Continues at the matching connector'], 14, 18, 'reg', MUTED));
p(`<path d="M ${W - 330} ${LEG_Y + 3} L ${W - 308} ${LEG_Y + 3} A 9 9 0 0 1 ${W - 290} ${LEG_Y + 3} L ${W - 268} ${LEG_Y + 3}" fill="none" stroke="${MUTED}" stroke-width="2.5"/>`);
p(textBlock(W - 258, LEG_Y - 2, ['Line hop — paths cross, they do not join'], 14, 18, 'reg', MUTED));

p('</svg>');

const dest = path.join(__dirname, 'askgov-tobe-process-flow.svg');
fs.writeFileSync(dest, out.join('\n'), 'utf8');
console.log('wrote', dest, `(${W}×${H})`);
console.log('rows', Object.fromEntries(Object.entries(R).map(([k, r]) => [k, `y=${Math.round(r.y)} h=${r.ext}`])));
console.log('arrows', ARROWS.length);
