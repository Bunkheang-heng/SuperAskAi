/**
 * Detection of a 200 that is not content (FR-47, FR-48).
 *
 * ── THE PROBLEM THIS SOLVES ────────────────────────────────────────────────
 * The crawler's change signal is built on one assumption: an HTTP 200 carries
 * the page. On Cambodian government infrastructure that assumption is wrong
 * often enough to poison the review queue, in three distinct ways:
 *
 *   1. A WAF refuses the request and says so in a 266-byte HTML page served
 *      with status 200. Observed on www.service.gov.kh, for every path on the
 *      host INCLUDING /robots.txt. The rejection page embeds a fresh support
 *      ID on every fetch, so its text hash changes every single run — a source
 *      that can never be read would raise a "modified" signal every week,
 *      forever, and a queue that cries wolf weekly is a queue nobody opens.
 *
 *   2. A single-page app serves the same client-rendered shell for every path
 *      with status 200, so /robots.txt, /sitemap.xml and forty imagined
 *      sub-pages all "exist". Observed on services.misti.gov.kh. Left
 *      unhandled, the crawler spends the source's entire page budget fetching
 *      one shell over and over and records it as forty distinct pages.
 *
 *   3. A JSON API answers `{"status":"fail","message":"Access Not Permitted"}`
 *      with status 200. Observed on services-api.misti.gov.kh. Recorded as
 *      content, an authentication wall becomes a "page".
 *
 * None of these are exotic. 31 of the 131 verified registry entries already
 * came back as `empty`, which is the same failure seen from the other side.
 *
 * ── WHY DETECTION AND NOT EVASION ──────────────────────────────────────────
 * A browser User-Agent gets through case 1; the honest one does not, and
 * neither does Googlebot's. Defeating a WAF by impersonating a browser is a
 * decision about how AskGov treats another institution's access control, not a
 * crawler setting, and lib/crawl/fetch.ts is explicit that this crawler
 * identifies itself honestly. So this module's job is to NAME the refusal
 * accurately and stop, leaving the access question where it belongs — with the
 * owning institution (section 2.6).
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Below this many characters of extracted text, a 200 is not really a page.
 *
 * Shared with the seed probe so `verify` and `monitor` agree on what counts as
 * a page; they used to hold separate opinions and only the probe had one.
 */
export const MIN_REAL_TEXT = 200;

/** Above this size, a body is too big to be one of the generic refusal pages. */
const GENERIC_MAX_BYTES = 4096;

export type SoftBlockKind = "waf" | "api-error";

export interface SoftBlock {
  kind: SoftBlockKind;
  /** Vendor or rule that matched, for the crawl report and the registry note. */
  detail: string;
}

/**
 * Vendor-specific interstitials.
 *
 * Matched at any body size because each string is distinctive enough that a
 * ministry page containing it verbatim would be a remarkable coincidence. The
 * generic patterns below are the ones that need a size guard.
 */
const VENDOR_SIGNATURES: Array<{ re: RegExp; detail: string }> = [
  // F5 BIG-IP ASM. This is the one on www.service.gov.kh.
  {
    re: /The requested URL was rejected\. Please consult with your administrator/i,
    detail: "F5 BIG-IP ASM rejection page",
  },
  { re: /<title>\s*Request Rejected\s*<\/title>/i, detail: "Request Rejected interstitial" },
  // Cloudflare challenge / block.
  { re: /Attention Required!\s*\|\s*Cloudflare/i, detail: "Cloudflare block page" },
  { re: /cf-error-details|__cf_chl_|cf_chl_opt/i, detail: "Cloudflare challenge" },
  // Imperva / Incapsula.
  { re: /Incapsula incident ID|_Incapsula_Resource/i, detail: "Imperva Incapsula block" },
  // Akamai.
  { re: /Access Denied[\s\S]{0,400}Reference\s*#\d+\./i, detail: "Akamai access denied" },
  // Sucuri.
  { re: /Sucuri WebSite Firewall\b/i, detail: "Sucuri WAF block" },
  // ModSecurity.
  { re: /ModSecurity Action|mod_security/i, detail: "ModSecurity block" },
];

/**
 * Refusals with no vendor branding.
 *
 * Only applied to small bodies. A ministry page about, say, restricted-access
 * archives can legitimately contain "access denied"; a 300-byte document whose
 * entire content is that phrase cannot.
 */
const GENERIC_SIGNATURES: Array<{ re: RegExp; detail: string }> = [
  { re: /<title>[^<]*\b(access denied|forbidden|blocked|not acceptable)\b[^<]*<\/title>/i, detail: "refusal page title" },
  { re: /\byour support id is\b/i, detail: "support-ID refusal page" },
  { re: /\b(request|access) (has been |was )?(denied|blocked|rejected)\b/i, detail: "refusal text" },
];

/**
 * A JSON body that reports its own failure.
 *
 * Deliberately narrow. It fires only when the envelope says failure AND
 * carries no payload, because plenty of healthy APIs return an `error` key set
 * to null, or a `status` field describing the resource rather than the request.
 */
function inspectJson(body: string): SoftBlock | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;

  const status = typeof obj.status === "string" ? obj.status.toLowerCase() : "";
  const failed =
    status === "fail" ||
    status === "error" ||
    obj.success === false ||
    obj.ok === false;
  if (!failed) return null;

  // A failure envelope that still carries data is a partial result, not a wall.
  for (const key of ["data", "result", "results", "items", "records"]) {
    const value = obj[key];
    if (Array.isArray(value) ? value.length > 0 : value != null) return null;
  }

  const message =
    typeof obj.message === "string" && obj.message
      ? obj.message
      : typeof obj.error === "string" && obj.error
        ? obj.error
        : "failure envelope";

  return { kind: "api-error", detail: `JSON ${status || "failure"}: ${message.slice(0, 80)}` };
}

/**
 * Decide whether a 200 body is actually content.
 *
 * Returns null when the body looks like a real document. Callers must treat a
 * non-null result as "we did not get the page", never as a page whose content
 * happens to be a refusal — snapshotting one is exactly how the phantom-change
 * loop described at the top of this file starts.
 */
export function detectSoftBlock(body: string, contentType = ""): SoftBlock | null {
  if (!body) return null;

  for (const { re, detail } of VENDOR_SIGNATURES) {
    if (re.test(body)) return { kind: "waf", detail };
  }

  if (/json/i.test(contentType)) {
    const json = inspectJson(body);
    if (json) return json;
  }

  if (body.length <= GENERIC_MAX_BYTES) {
    for (const { re, detail } of GENERIC_SIGNATURES) {
      if (re.test(body)) return { kind: "waf", detail };
    }
  }

  return null;
}

/**
 * Whether a body plausibly IS a robots.txt.
 *
 * A host that serves its SPA shell — or a WAF page — for /robots.txt hands the
 * parser a document with no directives in it, which parses to "no rules" and
 * silently reads as permission. That is a guess dressed up as a rule. Sniffing
 * the body lets the caller say "no rules were readable" and decide
 * deliberately, which is what lib/crawl/robots.ts now does.
 */
export function looksLikeRobotsTxt(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return false;
  // Markup or JSON: whatever this is, it is not the exclusion protocol.
  if (/^[<{[]/.test(trimmed)) return false;
  return /^\s*(user-agent|disallow|allow|crawl-delay|sitemap)\s*:/im.test(trimmed);
}

/** A 200 that carried too little text to be a document. */
export function isThin(text: string): boolean {
  return text.length < MIN_REAL_TEXT;
}
