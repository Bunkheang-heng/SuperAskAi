# AskGov — citizen interface and answer engine

Phase 0 build of the citizen-facing assistant specified in `AskGov-PRD-v0.2.md`.
Web, Next.js App Router, TypeScript.

> **Prototype. All knowledge base content is sample content and is not
> authoritative.** No ministry steward has approved anything in `data/`. Fees and
> deadlines are deliberately marked as placeholders rather than filled with
> plausible numbers — an invented fee is the exact harm R-06 and R-02 describe.

---

## Run it

```bash
npm install
cp .env.example .env.local     # then fill in a credential, or leave it empty
npm run dev                    # http://localhost:3000
```

It runs with **no credential configured**. With none, generation falls back to
the deterministic extractive provider, which quotes the retrieved provision
verbatim with its citation. Retrieval, tiering, guardrails, citation, the
verification gate, escalation, and the whole interface work unchanged.

```bash
npm run check          # typecheck + every check below
npm run eval           # M-03 recall@8 and M-04 refusal precision, no model calls
npm run verify-check   # proves the FR-15 gate blocks fabricated figures
npm run curated-check  # Tier 1 matching, and that greetings do not swallow questions
npm run scope-check    # definition vs off-domain vs coverage gap vs answered
```

---

## What is built

| PRD area | Status |
|---|---|
| §8.1 Query handling | Khmer + English input, Unicode normalisation and canonical reordering (FR-04), shared segmentation (FR-05), romanised-Khmer mapping (FR-03), alias expansion (FR-06), session follow-up rewriting (FR-07), language detection (FR-08) |
| §8.2 Answer generation | Three tiers, curated-first (FR-10/11), hybrid retrieval + RRF + rerank (FR-12/13), sources-only generation (FR-14), verification gate (FR-15), confidence-gated escalation (FR-16), effective-content-only filter (FR-18) |
| §6.1 Terminology | Plain-language explanation of official terms — instrument types, ministry abbreviations, administrative levels, and the three dates on a citation — served as Tier 1 from `data/glossary.json` |
| §8.3 Citation | Every field of FR-20 → FR-26, always visible |
| §8.4 Escalation | Explicit action (FR-27, FR-30), transcript handover to DG Support on Telegram (FR-28), office fallback details (FR-29) |
| §8.7 Content monitoring | Web adapter over a 130-source registry (FR-47), change signals raised to a steward review queue and never published (FR-49), raw copy and fetch timestamp retained (FR-54), §10.5 risk classification. Facebook, Telegram, video and document adapters not built |
| §8.8 Audit | Full FR-55 record, PII redacted before storage (FR-56) |
| §8.9 Citizen interface | FR-60 → FR-74 |
| §9 NFRs | NFR-01 gate, NFR-02 refusal, NFR-03 untrusted-content handling, NFR-04 output moderation, NFR-09 degradation, NFR-10 index swap, NFR-18 abstraction layer |
| §12 Guardrails | All eight rules, as a reviewable policy table |

### Why an answer was withheld

When AskGov declines, the trace panel shows a `withheld` reason. Two different
mechanisms produce a refusal and they need different responses, so they are
prefixed rather than lumped together:

| Reason | Meaning | What to do about it |
|---|---|---|
| `policy:<kind>` | The §12 refusal policy fired, before retrieval. `emergency`, `legal_advice`, `personal_case`, `prediction`, `land_dispute`, `tax_computation`, `political`, `complaint_routing` | Nothing — working as governed. Changing it is a governance decision (OD-07) |
| `scope:not_a_service_question` | Not a government-service question at all — translation, general knowledge, chit-chat. Refused **without** an escalation offer | Nothing. Sending someone to an officer because they asked for the weather wastes the officer's time and theirs |
| `retrieval:below_floor` | Nothing scored above `RETRIEVAL_MIN_SCORE`. AskGov is *allowed* to answer; it has no source that covers the question | Usually a **content coverage gap** — add the content. If the source clearly exists and should have matched, it is a retrieval problem (R-07) |
| `retrieval:no_candidates` | Retrieval returned nothing at all | Same, more clear-cut |
| `verification:failed` | An answer was written, then suppressed by the FR-15 gate for an unsupported claim | Check `unsupported claims` in the trace. Either the model invented a figure, or the source phrases it in a form the extractor misses |
| `moderation:<kind>` | NFR-04 output moderation caught the finished answer | Review the grounding prompt |
| `provider:escalated` | The model itself declined to answer from the sources | Often correct behaviour |

The distinction matters operationally: `policy:` means the platform is not
permitted to answer, `scope:` means there was nothing of its kind to answer, and
everything else means it was not *able* to. Reading a coverage gap as a policy
refusal sends a content task to the wrong team.

There is a fourth ending in that same branch which is **not** a refusal. A
question asking what an official term *means* — "what does prakas mean", "what
does ANK-BK stand for" — is answered from `data/glossary.json` as Tier 1, with
no `refusalReason` and no citation. §6.1 puts plain-language explanation of
official terminology in scope, and the off-domain copy above advertises exactly
that, so it has to actually work.

The glossary runs **after** the FR-16 confidence gate rather than alongside the
curated tier, which gives it a property worth stating plainly: it can only ever
convert a refusal into an answer, never displace a retrieved one. "Article" and
"province" are ordinary words, and a definition served in place of the procedure
someone asked for would be the worse answer.

### Measured, not asserted

`npm run eval` on the starter golden set (34 in-scope, 10 out-of-scope):

```
Recall @1        : 64.7%
Recall @3        : 88.2%
Recall @8  M-03  : 100.0%   target 85.0%   PASS
MRR              : 0.783
Refusal    M-04  : 100.0%   target 98.0%   PASS
```

`npm run verify-check` — 8/8 cases behave as specified: invented deadlines, fees,
document counts, and fabricated citation ids are all blocked; faithful
paraphrases and number-form changes ("thirty days" ⇄ "30 days") pass.

Three caveats on those numbers. The M-04 refusal figure is measured against ten
negatives that are mostly §12 policy cases refused by regex before retrieval —
it does not currently contain the hard case, and there is a live defect it
cannot see. Read the first entry under Known gaps before quoting it.

The golden set is 34 questions, not the ≥300
produced with the officers who answer these queries today (§13, weeks 1–3) —
treat it as a smoke test of the pipeline, not evidence of retrieval quality.
And M-01 groundedness and M-02 uncited-claim count cannot be computed without
human grading (D-05); the eval script says so rather than reporting a number it
cannot support.

---

## Content monitoring

```bash
npm run build-sources    # data/registry/*.csv → data/sources.json
npm run crawl:verify     # probe all 130 seeds, ~5 min, writes no content
npm run crawl:monitor    # change detection over confirmed sources
npm run crawl:weekly     # what the scheduled task runs: priority 1 and 2
```

Weekly scheduling on Windows, per-user, no admin rights:

```powershell
.\scripts\schedule-weekly.ps1              # Sunday 02:00 ICT by default
.\scripts\schedule-weekly.ps1 -Uninstall
```

### The registry

130 organisations — ministries, institutions, general departments, regulators,
25 provincial administrations, public universities, national hospitals. It is
maintained in `data/registry/seed_registry.py` and generated into
`data/sources.json`; **do not edit `data/sources.json` by hand.**

Every row carries a provenance code, and one value changes what the crawler is
allowed to do with it:

| `verified` | Meaning | Crawler behaviour |
|---|---|---|
| `directory` | From the official GDT directory at `tax.gov.kh/en/links` | Crawled |
| `wikipedia` | From the institution's Wikipedia infobox | Crawled |
| `search` | Seen verbatim on an official page or PDF | Crawled |
| `unconfirmed` | **Derived from a naming convention, never observed** | Probed by `crawl:verify`, skipped by `crawl:monitor` |

51 of the 130 are `unconfirmed` — mostly `<province>.gov.kh`, a pattern
confirmed for 7 of 25 provinces and assumed for the rest. They are leads, not
facts. `crawl:verify` is how a lead becomes a source: it probes the seed, and a
lead that returns 2xx with real content can then be promoted in the registry.
Nothing from an unconfirmed source enters change detection until that happens.

Two sources are disabled outright: `apps.customs.gov.kh` and
`digitalip.cambodiaip.gov.kh` are client-rendered SPAs where a static fetch
returns an empty shell. Recording that as "the page" would be worse than not
crawling them, so they wait for a headless adapter.

### What a crawl can and cannot do

It writes to `var/`. It cannot write to `data/kb/` — there is no function in
`lib/monitor/` that could. A crawl raises change signals to
`var/review-queue.jsonl`; a steward publishes. That is FR-49 and §10.4's closing
line, and it is why this can be pointed at live government infrastructure
without any risk of unreviewed content reaching a citizen.

Changes are classified `factual` or `presentation` against the §10.5 table —
fees, deadlines, required documents, eligibility, procedure steps, and the
instruments themselves. That classification **routes and prioritises, it does
not gate**: `autoPublishable` is hardcoded `false` for every change of every
class. §10.5 permits automating presentation-only changes, but that permission
assumes a classifier good enough to be trusted, and this one is a keyword scan
that cannot see a fee moved into an image or a deadline reworded from "30 days"
to "one month".

### Crawling government infrastructure

The politeness defaults are limits, not targets, and they are deliberate: a rude
crawler from a DGC address is a political problem before it is a technical one.

- `robots.txt` honoured per host, including `Crawl-delay`, with a named
  `User-Agent` group beating the wildcard
- **fail-closed on a 401/403 for `robots.txt` itself** — a host that will not
  show its rules is not inviting a guess
- 2s minimum between requests to one host; concurrency is across *different*
  hosts only, capped at 6
- 20s request timeout, 5MB body cap, retry only on 429/5xx with backoff, never
  on 4xx
- `Retry-After` honoured when the server sets it

**Set `MONITOR_CONTACT` before the first run.** It is embedded in the
`User-Agent` on every request and is the only way a ministry operator with a
problem can reach you. The default is a placeholder.

| Variable | Default | Purpose |
|---|---|---|
| `MONITOR_CONTACT` | `content-ops@askgov.kh` | Contact in the User-Agent. **Change this.** |
| `MONITOR_MIN_DELAY_MS` | `2000` | Floor between requests to one host |
| `MONITOR_CONCURRENCY` | `6` | Hosts in flight at once |
| `MONITOR_TIMEOUT_MS` | `20000` | Per-request timeout |
| `MONITOR_MAX_BYTES` | `5242880` | Body read cap |

---

## Architecture

```
Citizen browser
   │  POST /api/ask          ← the only path to a model. No credential ever
   ▼                           reaches the client (FR-74, R-15).
lib/engine/tiers.ts
   │
   ├─ guardrails.screen()         §12 refusal policy — BEFORE retrieval
   ├─ curated.matchCurated()      Tier 1, verbatim, no generation
   ├─ retrieval.retrieve()        normalise → segment → alias → BM25 + dense
   │                              → RRF → cross-encoder rerank
   ├─ confidence gate             FR-16 — BEFORE generation
   ├─ llm.generate()              Tier 2, sources only
   ├─ verify.verify()             FR-15 — can suppress a written answer
   ├─ guardrails.moderateOutput() NFR-04
   └─ citation assembly           FR-20 → FR-26
```

The order is the safety design. Guardrails run before retrieval so an
out-of-scope question never reaches a model. The confidence gate runs before
generation so weak retrieval escalates instead of producing a fluent answer over
irrelevant sources — the failure §13 calls worse than no service. The
verification gate runs after generation and can still withhold an answer that
has already been written.

### Model abstraction (NFR-18, BR-009)

Nothing outside `lib/llm/` contains model-specific logic.

| Provider | `LLM_PROVIDER` | Hosting | Residency |
|---|---|---|---|
| Claude, commercial API | `anthropic` | External | Outside Cambodia |
| Qwen via vLLM | `vllm` | DGC infrastructure | Cambodia |
| Deterministic extraction | `extractive` | In-process | Cambodia |

`lib/llm/anthropic.ts` carries a per-model parameter table, because the Messages
API rejects parameters a model does not support: Haiku 4.5 accepts `temperature`
and rejects `effort`; the Opus 5 / Sonnet 5 family is the reverse. Getting that
wrong is a 400 on every request, so it is a table rather than scattered
conditionals.

Migrating to Phase 1 is `LLM_PROVIDER=vllm` plus `VLLM_BASE_URL`. Before that is
a live path, §10.6 requires the Qwen benchmark against the Khmer golden set
(condition 4, R-13), DGC legal approval of licence terms (NFR-20, D-08), and
prompt revalidation against Qwen (condition 6). None of those are code tasks and
none are done.

---

## Configuration

See `.env.example`. Two settings are governance decisions rather than tuning
knobs:

- **`RETRIEVAL_MIN_SCORE`** — the FR-16 escalation floor, default `0.20`. Derived
  from the sweep `npm run eval` prints, not chosen by feel: at 0.20 the starter
  set answers 91.2% of in-scope questions and refuses 100% of out-of-scope ones,
  where 0.175 answers the same share but refuses only 90%. **Re-derive this
  whenever the corpus, the segmenter, or the reranker changes.**
- **`DIAGNOSTICS_ENABLED`** — FR-72/73. When false the server omits the
  diagnostic payload entirely, so retrieval internals never cross the network.
  See gaps: this is not yet a role check.

---

## Known gaps

Listed because a gap you can see is cheaper than one you discover at pilot.

### Start here: the confidence gate does not catch an adjacent-ministry question

The most serious open defect, and the one the rest of this build is designed to
prevent. It is a retrieval precision problem, not a routing one.

A service question from a ministry that is **not** onboarded can still score
above `RETRIEVAL_MIN_SCORE` on a shared verb, and is then answered fluently from
an unrelated source with a full citation. Reproduce with `npm run dev`:

| Question | Answered from | Top rerank |
|---|---|---|
| how do i register a new company | `MOI-CR-001` — birth registration | 0.358 |
| how do i get a passport | `MOI-CR-006` — the family book | 0.275 |
| how do i apply for a business licence | `MPWT-DL-004` — first driving licence | 0.291 |

The citizen who asks about registering a company is told to go to the commune
office within thirty days, presented as an approved government source. That is
precisely the failure §13 calls worse than no service, and the confidence gate
exists to stop it. "register", "apply" and "licence" are simply enough shared
signal to clear a floor tuned on a two-ministry corpus.

Note what this means for M-04 below. Refusal precision measures 100%, and that
number is real, but the golden set's ten negatives are eight §12 policy cases
(caught by regex before retrieval, so trivially refused) and two questions that
fall well below the floor. **It contains no plausible adjacent-ministry service
question** — the hard case — so the metric cannot currently see this failure.

Closing it is not a test fix, and probably not a threshold change either: at
0.25 the floor already costs 30 points of in-scope answer rate. It likely needs
a topicality check — does the top candidate share domain vocabulary with the
question, not just a verb — and re-deriving the floor against a golden set with
real adjacent-ministry negatives in it. Both are corpus-owner decisions, since
`RETRIEVAL_MIN_SCORE` is governance rather than tuning.

`scripts/scope-check.ts` documents the boundary of what is asserted today and
carries a note not to add these cases until the gate can tell them apart.

### The rest

1. **Diagnostics are gated by a server flag, not a role (FR-73).** Correct shape
   — the payload is omitted server-side rather than hidden in CSS — but before
   public release it must become a role check against the FR-59 RBAC model.
   Today, flag on means every caller of `/api/ask` receives it.
2. **DG Support handover is half-wired (D-04).** Our side works and is verified:
   `POST /api/escalate` stores the transcript server side (PII redacted) against a
   reference token and returns `https://t.me/DGSupportKH_bot?start=<ref>`, which
   the button opens.

   **The bot side is not verified.** FR-28's promise only holds if
   `@DGSupportKH_bot` implements a `/start` handler that resolves the token and
   shows the officer the transcript. That handler is not in this repository and
   has not been tested against a live bot. Until it exists, the interface
   deliberately does **not** tell the citizen their conversation has been passed
   along — it says only that the officer is sent the question. Do not soften that
   wording before the bot resolves refs, or the first citizen who has to repeat
   themselves is a broken promise rather than a missing feature.

   To close it: have the bot read the `start` payload, look the ref up (today
   `var/escalations.jsonl`, in production the domestic store), and post the
   transcript into the officer's view.
3. **The dense retriever is not a neural embedding model.** It is a hashed
   character-n-gram vector with cosine similarity — a real second signal with
   different failure modes from BM25, deliberately chosen because character
   n-grams degrade gracefully on Khmer without depending on segmentation being
   correct. A trained multilingual embedding model must be benchmarked and
   substituted (§13, weeks 1–3). Swap point is `lib/retrieval/embed.ts`.
4. **The reranker is lexical-overlap, not a cross-encoder (FR-13).** Swap point
   is `rerank()`. It runs over ~12 candidates, so a model there costs one small
   inference per query.
5. **Segmentation is a lexicon plus orthographic clusters, not a trained
   segmenter.** Visible in the trace panel: unlexicalised words fragment
   (`ដោ | យ | រ | បៀ`). Recall survives via cluster bigrams and the dense
   signal, but this is the top candidate for replacement (R-07).
6. **Khmer UI copy, `textKm` fields, and the `data/glossary.json` definitions
   need review by a Khmer-speaking content officer.** Written for structure, not
   signed off for language. The glossary additionally needs a ministry content
   steward to confirm the legal descriptions: the definitions state no fee,
   deadline, or office, and describe the normative hierarchy in general terms,
   but they are still prototype text asserting how Cambodian instruments relate
   to one another.
7. **Monitoring has no steward to raise changes to (FR-31, FR-49).** The crawler
   raises change signals correctly, but `var/review-queue.jsonl` is an
   append-only file that nothing reads. The content management portal (§8.5) is
   the consumer, and it does not exist — so today a detected fee change sits in
   a queue until a human runs `Get-Content var/review-queue.jsonl`. The crawler
   is only half the loop until FR-31 to FR-37 land.
8. **Not built at all:** the content management portal (§8.5), ingestion pipeline
   (§8.6 — OCR, article chunking, FR-44 question generation), the Facebook,
   Telegram, video and document monitoring adapters (FR-48, FR-46), RBAC (FR-59),
   content withdrawal (FR-57), versioning and supersession workflow (FR-58, the
   `superseded` flag is honoured by retrieval but nothing sets it),
   facility-directory routing (FR-17 — the directory exists in
   `data/facilities.json` but questions are not routed to it), voice (FR-09,
   FR-19, Phase 2), plain-language mode (NFR-16), steward reminder escalation
   (FR-53).
8. **Audit and feedback logs write to `var/*.jsonl` on local disk.** Gitignored.
   Production needs domestic managed storage under the NFR-13 retention policy
   and NFR-11 residency. `lib/log/audit.ts` is the seam.
9. **Emergency numbers in `data/facilities.json` are placeholders** and must be
   verified before any release — guardrail rule 6 depends on them being right.
10. **The FR-29 responsible-office block is not rendered.** The server still
    returns the details, but the interface does not display them because the
    directory holds `[SAMPLE NUMBER]` placeholders. Put verified contact details
    in `data/facilities.json` and restore the block in `AnswerBlock.tsx`.

### Conversation history is device-local by design

The sidebar lists recent conversations, restores them with their citations, and
supports per-item and bulk delete. It is backed by `localStorage` and **never
transmitted** (`lib/history.ts`).

That is a deliberate constraint, not an unfinished feature. The queries this
service receives are about births, deaths, lost identity documents, and money
owed, from an audience that section 5.1 describes as mobile-only and often on a
shared handset. Server-side history would mean holding an identifiable trail of
that, engaging NFR-11 (residency), NFR-12 (data protection principles apply
regardless of any public authority exemption), and NFR-13 (retention) — and
needing a lawful basis the initial release does not have, which is why §6.2 puts
personal data lookup out of scope.

Two consequences to be aware of: history does not follow the citizen across
devices, and because the handset may be shared, `clear` is one tap in the sidebar
rather than buried in settings. **The audit log (FR-55) is a separate, redacted,
operational record — it must not be joined to this.**

### Palette note

The brand palette is `#26A1DA` (sky), `#025094` (deep), `#FFFFFF`, with
`#4295F5` replacing the former amber for notices. Because `#4295F5` measures
about 3.0:1 on white — below WCAG AA for text under 18.66px bold, which is every
label using it — `T.noticeText` (`#1A5FBF`) carries the same hue darkened for
small type, while `T.notice` is used for borders, icons, and fills. One
consequence worth knowing: the FR-64 **"Review due"** freshness state is now blue
rather than amber, so it reads as informational next to the brand sky. The text
label still carries the meaning, and "Verified" (green) and "Past review date"
(red) are unchanged.

---

## Layout

```
app/
  page.tsx                  citizen entry (server component)
  api/ask/route.ts          the only model path
  api/feedback/route.ts     FR-50 / FR-67
  api/health/route.ts       provider + residency + per-ministry freshness
components/
  Chat.tsx                  conversation state
  AnswerBlock.tsx           answer + sources + escalation + notice
  SourceCard.tsx            the source receipt (FR-62/63)
  FreshnessBadge.tsx        FR-64
  DiagnosticPanel.tsx       FR-72/73
  Composer.tsx              FR-60, FR-69
  Sidebar.tsx               FR-68 + provider/residency card
lib/
  khmer/                    normalize · segment · romanize
  retrieval/                bm25 · embed · rrf · rerank · orchestration
  engine/                   tiers · curated · glossary · guardrails · verify · freshness
  llm/                      provider contract · anthropic · vllm · extractive
  monitor/                  fetch · robots · extract · classify · store · verify · crawl
  log/audit.ts              FR-55 / FR-56
data/
  kb/*.json                 sample chunks, FR-45 metadata, FR-44 questions
  curated.json              Tier 1 bank
  glossary.json             §6.1 official terminology
  aliases.json              FR-06 alias set
  facilities.json           FR-17 directory + emergency numbers
  golden.json               starter golden set
  sources.json              GENERATED monitored-source registry
  registry/                 upstream registry (Python) + CSV deliverables
scripts/
  eval.ts                   M-03 / M-04 + threshold sweep
  verify-check.ts           FR-15 evidence
  curated-check.ts          Tier 1 matching precision
  scope-check.ts            refusal-vs-answer routing
  build-sources.ts          registry CSV → data/sources.json
  crawl.ts                  FR-47 monitoring CLI (verify · monitor)
  schedule-weekly.ps1       Windows weekly task
```

---

## Open decisions this build assumes

`OD-01` — MPWT driving licences as the pilot domain, per the §16 recommendation,
with MOI civil registration seeded alongside so cross-ministry retrieval can be
exercised before onboarding.

`OD-03` — assumed yes (domestic inference required from Phase 1). The provider
abstraction and the residency display in both the sidebar and the trace panel
exist so that assumption is visible in the running system rather than buried in a
document.

`OD-05` — unresolved, and it blocks the Phase 0 start. The extractive fallback
exists so the pipeline can be built and measured while procurement is settled.
