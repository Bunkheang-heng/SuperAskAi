/**
 * Snapshot state, retained raw copies, and the review queue.
 *
 * FR-54 requires the raw fetched copy and the retrieval timestamp of all
 * monitored content to be retained for provenance. That is the point of this
 * module and it is not incidental: when a steward asks "where did this figure
 * come from", the answer has to be a file with a timestamp, not a claim.
 *
 * Everything lands under data/crawl/ on local disk. Production needs the same
 * domestic managed storage as the audit log under the NFR-13 retention policy
 * and NFR-11 residency â€” this module is the seam, exactly as lib/log/audit.ts
 * is for FR-55.
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { ChangeSignal, SourceSnapshot, CrawlReport } from "./types";

/**
 * Everything the crawler produces lives under data/crawl/.
 *
 * data/ is the data-source folder: the registry of monitored sites, the raw
 * copies fetched from them, the change signals derived from those, and the
 * approved corpus. One place to look for "where does SuperAsk's content come
 * from".
 *
 * â”€â”€ THE ONE LINE THAT MATTERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * data/kb/ is the ONLY directory retrieval reads. data/crawl/ is fetched
 * material that no steward has approved, sitting in the same parent folder as
 * material that has been. Nothing in lib/crawl/ writes to data/kb/, and
 * nothing in lib/retrieval/ reads data/crawl/ â€” the shared parent is a
 * convenience for humans, not a merge of the two.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */
const CRAWL_DIR = join(process.cwd(), "data", "crawl");
const RAW_DIR = join(CRAWL_DIR, "raw");
const SNAPSHOT_FILE = join(CRAWL_DIR, "snapshots.json");
const QUEUE_FILE = join(CRAWL_DIR, "review-queue.jsonl");
const REPORT_FILE = join(CRAWL_DIR, "last-report.json");

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** A filesystem-safe name for a URL, short enough for Windows path limits. */
function urlKey(url: string): string {
  return sha256(url).slice(0, 16);
}

/**
 * Retain the raw bytes exactly as fetched (FR-54).
 *
 * Keyed by content hash, so re-fetching an unchanged page every week does not
 * write 52 identical copies a year â€” but a page that changes and changes back
 * still resolves to the copy it matches.
 */
export function retainRaw(
  sourceId: string,
  url: string,
  body: string,
  rawHash: string,
): string {
  const dir = join(RAW_DIR, sourceId);
  ensureDir(dir);

  const name = `${urlKey(url)}-${rawHash.slice(0, 12)}.html`;
  const full = join(dir, name);

  if (!existsSync(full)) {
    writeFileSync(
      full,
      // A provenance header, so the file is self-describing if it is ever read
      // outside this system.
      `<!-- SuperAsk monitor Â· source=${sourceId} Â· url=${url} Â· fetched=${new Date().toISOString()} Â· sha256=${rawHash} -->\n${body}`,
      "utf8",
    );
  }

  return join("data", "crawl", "raw", sourceId, name);
}

/**
 * Read back a retained copy, without the provenance header this module adds.
 *
 * This is what makes the risk classifier work on the actual difference rather
 * than on the whole page: the previous text is recovered from the retained
 * bytes and diffed against the current fetch. Returns null if the copy has been
 * pruned, in which case the caller falls back to classifying the full text â€”
 * over-reporting, which is the right direction to fail in.
 */
export function readRaw(rawPath: string): string | null {
  const full = join(process.cwd(), rawPath);
  if (!existsSync(full)) return null;
  try {
    return readFileSync(full, "utf8").replace(/^<!-- SuperAsk monitor[^>]*-->\n/, "");
  } catch {
    return null;
  }
}

export type SnapshotState = Record<string, SourceSnapshot>;

export function loadSnapshots(): SnapshotState {
  if (!existsSync(SNAPSHOT_FILE)) return {};
  try {
    return JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) as SnapshotState;
  } catch {
    // A corrupt snapshot file must not stop a crawl. The cost of starting over
    // is one noisy run where everything reads as new, which is recoverable;
    // the cost of not crawling is silent staleness, which is not.
    return {};
  }
}

export function saveSnapshots(state: SnapshotState): void {
  ensureDir(CRAWL_DIR);
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Append change signals to the steward review queue (FR-49).
 *
 * Append-only JSONL, same shape as the audit log: a queue that can be rewritten
 * is a queue whose history cannot be trusted. Approval and rejection are
 * recorded as later entries once FR-31's portal exists, not as edits to these.
 */
export function raiseToQueue(changes: ChangeSignal[]): void {
  if (changes.length === 0) return;
  ensureDir(CRAWL_DIR);
  appendFileSync(
    QUEUE_FILE,
    changes.map((c) => JSON.stringify(c)).join("\n") + "\n",
    "utf8",
  );
}

export function saveReport(report: CrawlReport): void {
  ensureDir(CRAWL_DIR);
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");
}

export function pendingCount(): number {
  if (!existsSync(QUEUE_FILE)) return 0;
  return readFileSync(QUEUE_FILE, "utf8").split("\n").filter(Boolean).length;
}
