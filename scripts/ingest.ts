/**
 * Content ingestion (§8.6) — WordPress adapter.
 *
 * Turns published government pages into retrievable chunks with FR-45 metadata.
 * First real content in data/kb/; everything else there is hand-written sample.
 *
 * ── WHY THE WORDPRESS API AND NOT THE HTML ─────────────────────────────────
 * cambodiaip.gov.kh runs WordPress with /wp-json/ open, which gives the page
 * body, the title, and — crucially — the publisher's own `modified` timestamp.
 * That last field is the difference between an honest `verified` date and a
 * guessed one. Scraping the rendered HTML would give the same words with no
 * idea when the ministry last touched them.
 *
 * ── BOILERPLATE REMOVAL IS NOT COSMETIC ────────────────────────────────────
 * These pages inject the whole site menu into the content body — 40+ nav items
 * before a word of substance. Indexed as-is, every page becomes a near-identical
 * bag of the words "Trademark Patent Copyright Industrial Design", and BM25
 * scores them all equally for every IP question. Retrieval would be actively
 * worse than having no content.
 *
 * So: a line appearing on 3+ ingested pages is chrome, not content, and is
 * dropped. Cheap, and it needs no per-site CSS selector to maintain.
 *
 * ── WHAT THIS DOES NOT DO ──────────────────────────────────────────────────
 * It does not mark anything steward-approved. Every chunk it writes carries
 * `stewardApproved: false`. §10.5 requires a human to approve publication of
 * fees, deadlines, required documents, eligibility and procedure steps, and
 * nothing here substitutes for that.
 *
 * Run: npx tsx scripts/ingest.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const UA =
  "AskGovBot/0.1 (+https://askgov.kh/bot; " +
  (process.env.MONITOR_CONTACT ?? "content-ops@askgov.kh") +
  ") DGC content ingestion";

interface Target {
  slug: string;
  /** Chunk id prefix — stable, so re-ingesting does not renumber citations. */
  id: string;
  /**
   * The legal instrument this page's content rests on, where the page states
   * one. Left undefined rather than guessed: an invented instrument number is
   * the FR-45 failure this build exists to avoid.
   */
  instrument?: string;
  article?: string;
  section: string;
  keywords: string[];
  /** FR-44 candidate citizen questions, indexed alongside the chunk. */
  questions: string[];
}

const BASE = "https://www.cambodiaip.gov.kh";
const API = `${BASE}/en/wp-json/wp/v2/pages`;

const MINISTRY = "Ministry of Commerce";
const MINISTRY_KM = "ក្រសួងពាណិជ្ជកម្ម";
const DOC = "Department of Intellectual Property Rights — published guidance";

const TARGETS: Target[] = [
  {
    slug: "trademark",
    id: "MOC-TM-001",
    instrument: "Law on Marks, Trade Names and Acts of Unfair Competition",
    article: "Article 4",
    section: "What a mark is, types of mark, and marks that cannot be registered",
    keywords: [
      "trademark", "mark", "trade mark", "service mark", "logo", "brand",
      "ម៉ាក", "ពាណិជ្ជសញ្ញា", "សេវាសញ្ញា", "ចុះបញ្ជីម៉ាក",
    ],
    questions: [
      "What is a trademark?",
      "What counts as a mark?",
      "What types of trademark are there?",
      "Which marks cannot be registered?",
      "Why was my trademark refused?",
      "Can I register a colour as a trademark?",
      "Can I use a national flag in my logo?",
      "តើម៉ាកគឺជាអ្វី?",
      "ម៉ាកបែបណាដែលមិនអាចចុះបញ្ជីបាន?",
      "ម៉ាកមានប្រភេទអ្វីខ្លះ?",
    ],
  },
  {
    slug: "mark-admendement",
    id: "MOC-TM-002",
    section: "Change of trademark ownership and how to record it",
    keywords: [
      "trademark", "mark", "ownership", "transfer", "assignment", "change owner",
      "ម៉ាក", "ផ្លាស់ប្តូរម្ចាស់កម្មសិទ្ធិ", "ផ្ទេរសិទ្ធិ", "កម្មសិទ្ធិម៉ាក",
    ],
    questions: [
      "How do I transfer trademark ownership?",
      "How do I record a change of trademark owner?",
      "What documents prove trademark ownership transfer?",
      "Can I transfer only part of a trademark?",
      "I sold my business — what happens to the trademark?",
      "តើការផ្លាស់ប្តូរម្ចាស់កម្មសិទ្ធិម៉ាកធ្វើដូចម្តេច?",
      "ត្រូវការឯកសារអ្វីខ្លះដើម្បីផ្ទេរសិទ្ធិម៉ាក?",
    ],
  },
];

/**
 * Pages fetched to establish what is chrome, but never emitted as chunks.
 *
 * Every one of these is a live URL that a citizen would reasonably expect to
 * answer a question, and every one currently carries only the site menu or the
 * placeholder "អត្ថបទកំពុងកែសម្រួល។" — "this article is being edited". They are
 * listed so the ingest report says so out loud rather than silently producing
 * nothing.
 */
const CHROME_ONLY = [
  "trademark-registration",
  "what-is-a-trademark",
  "collective-marks",
  "right-confered-by-registration",
  "agent",
  "registration-forms",
];

interface Page {
  slug: string;
  link: string;
  title: string;
  modified: string;
  lines: string[];
}

function textFromHtml(html: string): string[] {
  let s = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // Mark list items before stripping tags. Government procedure text is mostly
  // numbered steps with sub-conditions; flattening <li> to a bare newline loses
  // exactly the structure a citizen needs to follow it, and Khmer has no
  // capitals or word spaces to imply that structure back.
  s = s.replace(/<li\b[^>]*>/gi, "\n• ");
  s = s.replace(/<\/(p|li|div|tr|h[1-6]|br)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

  return s
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

async function fetchPage(slug: string): Promise<Page | null> {
  const res = await fetch(
    `${API}?slug=${encodeURIComponent(slug)}&_fields=slug,link,title,modified,content`,
    { headers: { "user-agent": UA } },
  );
  if (!res.ok) return null;

  const rows = (await res.json()) as Array<{
    slug: string;
    link: string;
    title: { rendered: string };
    modified: string;
    content: { rendered: string };
  }>;
  if (!rows.length) return null;

  const p = rows[0];
  return {
    slug: p.slug,
    link: p.link,
    title: p.title.rendered.replace(/<[^>]+>/g, "").trim(),
    modified: p.modified,
    lines: textFromHtml(p.content.rendered),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const slugs = [...TARGETS.map((t) => t.slug), ...CHROME_ONLY];
  const pages: Page[] = [];

  console.log(`\nIngesting from ${BASE}\n${"=".repeat(74)}`);

  for (const slug of slugs) {
    const p = await fetchPage(slug);
    if (p) pages.push(p);
    console.log(
      `  ${p ? "fetched " : "MISSING "} ${slug.padEnd(34)} ${p ? p.modified : ""}`,
    );
    await sleep(2000); // registry politeness floor
  }

  // A line on 3+ pages is site chrome, not content.
  const seen = new Map<string, number>();
  for (const p of pages) {
    for (const line of new Set(p.lines)) {
      seen.set(line, (seen.get(line) ?? 0) + 1);
    }
  }
  const isChrome = (line: string) => (seen.get(line) ?? 0) >= 3;

  const today = new Date().toISOString().slice(0, 10);
  const reviewDue = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);

  const chunks = [];
  console.log(`${"=".repeat(74)}`);

  for (const t of TARGETS) {
    const page = pages.find((p) => p.slug === t.slug);
    if (!page) {
      console.log(`  SKIP  ${t.id}  ${t.slug} — not fetched`);
      continue;
    }

    const body = page.lines.filter((l) => !isChrome(l)).join("\n").trim();
    if (body.length < 200) {
      console.log(
        `  SKIP  ${t.id}  ${t.slug} — ${body.length} chars after chrome removal`,
      );
      continue;
    }

    chunks.push({
      id: t.id,
      doc: DOC,
      // No instrument on a guidance page that cites none. An empty string would
      // render as a citation with a blank legal reference; the honest value is
      // the page's own description of itself.
      instrument: t.instrument ?? "Published guidance (no instrument cited on page)",
      article: t.article ?? t.section,
      url: page.link,
      // The publisher's own last-modified date. Not our fetch date, and not a
      // guess — this is the ministry saying when it last touched the page.
      effective: page.modified.slice(0, 10),
      verified: today,
      reviewDue,
      geoScope: "KH",
      sensitivity: "public" as const,
      stewardApproved: false,
      ingestedAt: new Date().toISOString(),
      ingestedFrom: page.link,
      text: body,
      textKm: body,
      keywords: t.keywords,
      questions: t.questions,
    });

    console.log(`  chunk ${t.id}  ${body.length} chars  ${t.questions.length} questions`);
  }

  // Say out loud which pages a citizen would expect to be useful and are not.
  const empty = CHROME_ONLY.map((slug) => {
    const p = pages.find((x) => x.slug === slug);
    if (!p) return { slug, chars: -1 };
    return { slug, chars: p.lines.filter((l) => !isChrome(l)).join("\n").trim().length };
  });

  const out = {
    _comment:
      "MACHINE-INGESTED from cambodiaip.gov.kh via the WordPress REST API. Not steward-approved: every chunk carries stewardApproved:false. §10.5 requires human approval before fees, deadlines, required documents, eligibility or procedure steps are published to citizens.",
    _sourceNote:
      "The Department of Intellectual Property Rights does NOT currently publish the trademark registration procedure. /en/trademark-registration/ exists but contains only the placeholder 'អត្ថបទកំពុងកែសម្រួល។' (this article is being edited). AskGov therefore cannot answer 'how do I register a trademark' from this source, and should not pretend otherwise.",
    _ingestedAt: new Date().toISOString(),
    ministry: MINISTRY,
    ministryKm: MINISTRY_KM,
    chunks,
  };

  const path = join(process.cwd(), "data", "kb", "moc-trademark.json");
  writeFileSync(path, JSON.stringify(out, null, 2), "utf8");

  console.log(`${"=".repeat(74)}`);
  console.log(`\nWrote data/kb/moc-trademark.json — ${chunks.length} chunks\n`);
  console.log("Pages with no publishable content (site menu or placeholder only):");
  for (const e of empty) {
    console.log(`  ${e.slug.padEnd(34)} ${e.chars < 0 ? "not found" : `${e.chars} chars`}`);
  }
  console.log(
    `\nAll chunks are stewardApproved:false. Nothing here has been reviewed by\n` +
      `a ministry content steward (§10.5, FR-49).\n`,
  );
}

main();
