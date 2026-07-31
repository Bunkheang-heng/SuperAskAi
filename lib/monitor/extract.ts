/**
 * HTML → title, readable text, and same-host links.
 *
 * Deliberately a small hand-written extractor rather than a parser dependency.
 * The job is narrow — strip markup, keep words, find hrefs — and this codebase
 * carries no HTML parser today. A change-detection hash does not need a correct
 * DOM; it needs the same input to produce the same output, and different
 * content to produce different output.
 *
 * The Khmer consideration matters more than the markup one: extracted text is
 * passed through the same FR-04 normalisation the index and query paths use, so
 * a ministry re-encoding a page — same words, different byte sequence for a
 * stacked cluster — does not read as a content change. Without that, one CMS
 * migration would flood the review queue with 40 phantom changes.
 */

import { normalize } from "@/lib/khmer/normalize";

/** Elements whose contents are never citizen-visible text. */
const STRIP_BLOCKS =
  /<(script|style|noscript|svg|canvas|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi;

const COMMENTS = /<!--[\s\S]*?-->/g;

/** Block-level tags become newlines so paragraphs do not run together. */
const BLOCK_TAGS =
  /<\/?(p|div|br|hr|li|ul|ol|tr|td|th|table|h[1-6]|section|article|header|footer|nav|main|aside|form|blockquote)\b[^>]*>/gi;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&laquo;": "«",
  "&raquo;": "»",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/gi, (m) => {
      const named = ENTITIES[m.toLowerCase()];
      if (named !== undefined) return named;
      const dec = /^&#(\d+);$/.exec(m);
      if (dec) return String.fromCodePoint(Number(dec[1]));
      const hex = /^&#x([0-9a-f]+);$/i.exec(m);
      if (hex) return String.fromCodePoint(parseInt(hex[1], 16));
      return m;
    });
}

export interface Extracted {
  title: string;
  text: string;
  links: string[];
}

export function extract(html: string, baseUrl: string): Extracted {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch
    ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim().slice(0, 200)
    : "";

  const links = extractLinks(html, baseUrl);

  const text = normalize(
    decodeEntities(
      html
        .replace(COMMENTS, " ")
        .replace(STRIP_BLOCKS, " ")
        .replace(BLOCK_TAGS, "\n")
        .replace(/<[^>]+>/g, " "),
    )
      // Collapse runs of blank lines, then runs of spaces, so trivial whitespace
      // churn in the source does not register as a change.
      .replace(/[ \t ]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim(),
  );

  return { title, text, links };
}

/** Same-host, http(s), fragment- and query-stripped, de-duplicated. */
function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const out = new Set<string>();

  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1].trim();
    if (!href || href.startsWith("#")) continue;
    if (/^(mailto|tel|javascript|data):/i.test(href)) continue;

    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (url.host !== base.host) continue;

    // Query strings on government CMSs are overwhelmingly pagination, sort
    // order and session ids — following them multiplies the crawl for no new
    // content. The fragment never identifies a different document.
    url.hash = "";
    url.search = "";

    // Skip obvious binaries. The document adapter (section 10.4) is the right
    // home for linked files, and this build does not implement it yet.
    if (/\.(zip|rar|7z|exe|msi|mp4|mp3|avi|mov|jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
      continue;
    }

    out.add(url.toString());
  }

  return [...out];
}
