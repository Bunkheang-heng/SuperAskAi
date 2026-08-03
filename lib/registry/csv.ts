/**
 * CSV read/write for the registry.
 *
 * data/registry/websites_master.csv is the single committed registry file: the
 * organisation record, its crawl seed (seed_*) and its last probe result
 * (verify_*) on one row per source. scripts/build-sources.ts reads it,
 * scripts/crawl.ts writes the verify_* columns back into it, so the parser and
 * the writer live here rather than being reimplemented on each side.
 *
 * Written utf-8-sig: build_dataset.py emits a BOM for Excel, and the Khmer
 * organisation names are unreadable in Excel without it.
 */

export const BOM = "﻿";

/** RFC 4180 — fields may contain commas, quotes and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const s = text.replace(/^﻿/, "");

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];

    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // handled by \n
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export function toRecords(csv: string): Array<Record<string, string>> {
  const rows = parseCsv(csv);
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (r[i] ?? "").trim()));
    return rec;
  });
}

/** Header order is preserved; a record missing a column writes an empty field. */
export function fromRecords(
  header: string[],
  records: Array<Record<string, string>>,
): string {
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return (
    BOM +
    [
      header.map(esc).join(","),
      ...records.map((r) => header.map((h) => esc(r[h])).join(",")),
      "",
    ].join("\n")
  );
}
