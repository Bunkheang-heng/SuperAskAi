# `data/` — the data source folder

Everything AskGov's answers can come from, and everything it watches, lives
here. One place to look for "where does this content come from".

```
data/
  kb/                    APPROVED CORPUS — the only thing retrieval reads
  curated.json           Tier 1 human-approved answers (FR-10, FR-11)
  glossary.json          Tier 1 official terminology (§6.1)
  aliases.json           FR-06 query expansion
  facilities.json        FR-17 office directory + emergency numbers
  golden.json            evaluation set — test data, never served

  sources.json           GENERATED registry of 132 monitored sites
  registry/              upstream registry (Python) that generates it
  crawl/                 FETCHED MATERIAL — no steward has approved any of it
```

---

## The line that runs through this folder

Two kinds of content sit here and they are **not** interchangeable.

| | Approved | Fetched |
|---|---|---|
| Where | `kb/`, `curated.json`, `glossary.json` | `crawl/` |
| Status | A human signed it off | Nobody has looked at it |
| Retrieval reads it | **Yes** | **Never** |

`lib/retrieval/` reads `kb/` and nothing else. `lib/monitor/` writes `crawl/`
and nothing else — there is no function in it that can write to `kb/`.

That gap is FR-49 and §10.4: monitored content must not reach a citizen without
steward approval. It is deliberate, and it is also why **adding a site to
`sources.json` does not make AskGov able to answer questions about it.** The
crawler tells you a page changed. Turning a page into an answerable, cited chunk
is the §8.6 ingestion pipeline, which is not built yet.

If you are wondering why a question about a ministry in `sources.json` still
gets refused — that is the reason, and it is working as designed rather than
failing.

---

## `kb/` — the approved corpus

One file per ministry-domain. Every chunk carries the FR-45 metadata set:
ministry, document, legal instrument, article, effective date, verified date,
review date, geographic scope, sensitivity.

**Currently 45 chunks across 4 organisations.** The corpus is no longer uniform,
and the difference matters more than the count:

| File | Chunks | Provenance |
|---|---|---|
| `mpwt-driving-licence.json` | 14 | Real — MPWT published service page |
| `mpwt-vehicle-registration.json` | 15 | Real — MPWT published service page |
| `nbc-consumer-finance.json` | 6 | Real — NBC Prakas PDFs, read at article level |
| `moc-trademark.json` | 2 | Real — machine-ingested (`scripts/ingest.ts`) |
| `moi-civil-registration.json` | 8 | **SAMPLE** — placeholder fees, `Prakas No. XXX` |

**Nothing here is steward-approved.** Every real chunk carries
`stewardApproved: false`, which is the whole point: reading an official page is
not a ministry signing off on it (§10.5, FR-49).

Three honesty conventions run through the real content, and they should be kept
if you add more:

- **No invented instrument numbers.** Where a source page cites no legal
  instrument, `article` reads `Not cited on source page` rather than a
  plausible-looking article number. The MPWT files cite the governing Prakas by
  its real number located in the ministry's own document repository; the NBC
  files carry genuine article numbers because the article text itself was read.
- **No back-translated Khmer.** `textKm` is present where verbatim Khmer was
  read from the source, and absent where it was not. Machine-translating English
  into a Khmer `textKm` would fabricate a source text no ministry ever wrote.
- **Untranslatable terms stay in Khmer.** See `_untranslatedNote` in the vehicle
  registration file.

`moi-civil-registration.json` is still sample content: instrument numbers read
`Prakas No. XXX`, and fees are deliberately placeholders rather than plausible
figures, because an invented fee is the exact harm R-06 describes. It should be
replaced the same way the MPWT files were.

One field to treat with suspicion: `verified` claims someone checked the text
against the official source on that date. For the real content that check was a
machine reading the page, not a person; for the sample content nobody did.

## `sources.json` and `registry/`

`sources.json` is **generated — do not edit it by hand.** The upstream registry
is `registry/seed_registry.py`; regenerate with `npm run build-sources`.

`registry/websites_master.csv` is the single registry file that bridge reads:
one row per source carrying the organisation record, its crawl seed (`seed_*`)
and its last probe result (`verify_*`).

132 organisations, each carrying a provenance code. `verified=unconfirmed` means
the domain was derived from a naming convention and never observed — a lead, not
a fact, and excluded from monitoring until a probe confirms it.

## `crawl/` — fetched, unapproved

| File | What it is |
|---|---|
| `verification.json` | Seed probe results — which of the 132 are live, dead, blocked, WAF-refused, or JS-shelled. The same results are written back onto each source's row in `registry/websites_master.csv` as its `verify_*` columns |
| `snapshots.json` | Per-page content hashes, the baseline change detection compares against |
| `raw/<SRC-ID>/*.html` | Retained raw copies with fetch timestamps (FR-54 provenance) |
| `review-queue.jsonl` | Append-only change signals awaiting a steward (FR-49) |

`review-queue.jsonl` is append-only on purpose: a queue that can be rewritten is
a queue whose history cannot be trusted. Approvals and rejections are recorded
as later entries, not edits to earlier ones.

Nothing reads that queue yet. The consumer is the §8.5 content management portal
and it does not exist, so today a detected fee change sits there until a human
opens the file.

## Size

`crawl/raw/` grows with every changed page — copies are keyed by content hash,
so an unchanged page is not re-stored, but a busy news site will accumulate. If
this folder is committed to git, prune `crawl/raw/` on a retention schedule
rather than letting it grow without bound. See NFR-13.
