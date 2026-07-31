/**
 * Polite HTTP for the web adapter.
 *
 * ── THIS CRAWLER HITS GOVERNMENT INFRASTRUCTURE ────────────────────────────
 * Forty-three ministry and agency sites, weekly, from a service that is meant
 * to be a good citizen of the same government. Several are small deployments
 * that will not have been sized for an automated client. Getting AskGov's
 * crawler blocked — or worse, having it degrade a ministry site — costs the
 * platform the institutional relationships the entire project depends on.
 *
 * So the defaults here are conservative on purpose, and every one of them is a
 * limit rather than a target:
 *
 *   · robots.txt honoured, including Crawl-delay      (lib/monitor/robots.ts)
 *   · a real User-Agent naming the service and a contact address
 *   · a minimum delay between requests to the SAME host, always
 *   · a hard per-request timeout, so one hanging site cannot stall the run
 *   · retry only on 429/5xx and network errors, with backoff, twice at most
 *   · no retry at all on 4xx — the site said no, asking again is rude
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Identify the crawler honestly and give an operator someone to contact.
 *
 * An anonymous or spoofed User-Agent on government infrastructure is how a
 * monitoring crawler becomes a security incident. Override the contact address
 * with MONITOR_CONTACT once a real mailbox exists.
 */
const CONTACT = process.env.MONITOR_CONTACT ?? "content-ops@askgov.kh";
export const USER_AGENT = `AskGovBot/0.1 (+https://askgov.kh/bot; ${CONTACT}) DGC content monitoring`;

/** Floor on the gap between two requests to one host, even if robots allows faster. */
export const MIN_HOST_DELAY_MS = Number(process.env.MONITOR_MIN_DELAY_MS ?? "2000");

const TIMEOUT_MS = Number(process.env.MONITOR_TIMEOUT_MS ?? "20000");
const MAX_ATTEMPTS = 3;
const MAX_BYTES = Number(process.env.MONITOR_MAX_BYTES ?? String(5 * 1024 * 1024));

export interface FetchResult {
  status: number;
  url: string;
  contentType: string;
  body: string;
  fetchedAt: string;
}

const lastHitAt = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait out the per-host delay. Shared by the crawler and the robots fetcher so
 * that reading robots.txt is itself rate limited against the host.
 */
export async function waitForHost(host: string, delayMs: number): Promise<void> {
  const wait = Math.max(delayMs, MIN_HOST_DELAY_MS);
  const last = lastHitAt.get(host);
  if (last !== undefined) {
    const elapsed = Date.now() - last;
    if (elapsed < wait) await sleep(wait - elapsed);
  }
  lastHitAt.set(host, Date.now());
}

/** True for a status worth trying again. 4xx is a refusal, not a hiccup. */
function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Read at most MAX_BYTES of the body.
 *
 * A monitoring crawler has no business pulling a 400MB video down a metered
 * link, and an unbounded read is also how one misconfigured source exhausts
 * memory for the whole run.
 */
async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.length;
    if (total >= MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }

  return new TextDecoder("utf-8").decode(
    chunks.reduce((acc, c) => {
      const out = new Uint8Array(acc.length + c.length);
      out.set(acc);
      out.set(c, acc.length);
      return out;
    }, new Uint8Array()),
  );
}

/**
 * Fetch one URL politely. Never throws for an HTTP status — the status is the
 * result, and a 404 on a monitored page is itself a change signal worth
 * recording rather than an exception to unwind.
 */
export async function politeFetch(
  url: string,
  crawlDelayMs: number,
): Promise<FetchResult> {
  const host = new URL(url).host;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await waitForHost(host, crawlDelayMs);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5",
          "accept-language": "km,en;q=0.8",
        },
      });

      const contentType = res.headers.get("content-type") ?? "";
      const isText = /text\/|xml|json/i.test(contentType);
      const body = isText ? await readCapped(res) : "";
      if (!isText) await res.body?.cancel().catch(() => {});

      if (isRetryable(res.status) && attempt < MAX_ATTEMPTS) {
        // Honour Retry-After when the server sets it; it knows better than we do.
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 2000 * attempt,
        );
        lastError = `HTTP ${res.status}`;
        continue;
      }

      return {
        status: res.status,
        url: res.url || url,
        contentType,
        body,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.name === "AbortError"
            ? `timeout after ${TIMEOUT_MS}ms`
            : err.message
          : String(err);
      if (attempt < MAX_ATTEMPTS) await sleep(2000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  // Status 0 means "never got an HTTP response". Distinct from a 5xx, which is
  // the site telling us something.
  return {
    status: 0,
    url,
    contentType: "",
    body: lastError,
    fetchedAt: new Date().toISOString(),
  };
}
