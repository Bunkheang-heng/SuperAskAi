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
npm run check            # typecheck + test + build + every harness below. CI runs this
npm test                 # 617 unit and integration tests, no model calls
npm run test:watch       # the same, on change
npm run test:coverage    # the same, with v8 coverage and its thresholds enforced
npm run eval             # M-03 recall@8 and M-04 refusal precision, no model calls
npm run verify-check     # proves the FR-15 gate blocks fabricated figures
npm run curated-check    # Tier 1 matching, and that greetings do not swallow questions
npm run scope-check      # definition vs off-domain vs coverage gap vs answered
npm run rationale-check  # "why does this rule exist" when no source gives a reason
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
| §8.7 Content monitoring | Web adapter over a 132-source registry (FR-47), change signals raised to a steward review queue and never published (FR-49), raw copy and fetch timestamp retained (FR-54), §10.5 risk classification. Facebook, Telegram, video and document adapters not built |
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

`npm run check` is the whole gate — typecheck, tests, build, and every harness
below. It exits non-zero on a regression in any of them, and CI runs it on every
push and pull request (`.github/workflows/ci.yml`). CI runs with **no provider
credential**: generation falls back to the deterministic extractive provider, so
nothing in it makes a paid model call and a fork's pull request cannot spend the
gateway credit. Everything measured here is pre-model anyway.

`npm run eval` on the starter golden set (34 in-scope, 10 out-of-scope):

```
Recall @1        : 67.6%
Recall @3        : 82.4%
Recall @8  M-03  : 94.1%   target 85.0%   PASS
MRR              : 0.768
Refusal    M-04  : 100.0%  target 98.0%   PASS
  by gate        : policy 8 · scope 1 · floor 1
```

The by-gate line is what makes M-04 readable rather than merely green. Eight of
the ten negatives are §12 policy cases caught by regex before retrieval, one is
caught by the positive scope gate, and exactly one rests on the retrieval floor.
A shift between those columns is a real change in how the service refuses, and
it is now visible instead of being averaged away.

The harness applies all three gates in the order `lib/engine/tiers.ts` applies
them — policy, then scope, then the FR-16 floor. It previously skipped the scope
gate, which understated M-04: "what is the capital of france" scores 0.205
against a 0.200 floor and was counted as a leak, while the running service
refuses it as `scope:not_a_service_question` before retrieval is ever consulted.
A harness that models a different order measures a system nobody is running.

**Ordering is the constraint, not recall.** Fusion already puts the correct chunk
inside the reranker's shortlist for 94.1% of the golden set, and the reranker
drops none of them — so Recall@8 is not what is limiting the service. Replacing
the reranker with an oracle (correct chunk first whenever it is in the
shortlist) would take Recall@1 from 67.6% to 94.1% and MRR to 0.941. That gap is
the whole value of the FR-13 cross-encoder swap, and it is why `rerank.ts` and
not `embed.ts` is the next model to land: a better embedder improves a recall
number that is already sufficient.

The last change to close part of that gap was suffix stripping — see
`lib/lang/stem.ts`, which lifted Recall@1 by 8.8 points on its own by making
`registering` match `register`. Lexical variants beyond it (IDF-weighted
coverage, blending the dense score into the rerank, debiasing chunks that carry
more candidate questions, sweeping the RRF constant) were each measured and each
made things worse or made no difference. The cheap lexical levers are spent.

One open decision the sweep surfaces: the FR-16 floor sits at `0.200`, which
answers 73.5% of in-scope questions. At `0.150` it answers 88.2% with refusal
still at 100%. That looks free, but the by-gate line is the caveat — only *one*
of the ten negatives rests on the floor at all, so the sweep's refusal column is
one question wide. The floor's real job is catching out-of-domain questions the
golden set does not contain, and that is untested. Widen the negatives before
trusting the sweep.

`npm run test` — 599 tests across 21 files, no model called, **89% line coverage**
over `lib/` and `app/api/`:

| Suite | Covers |
|---|---|
| `tests/engine/tiers` | §10.2 tiering and **the order the gates run in** — policy before scope before retrieval before generation. Post-generation branches use a mocked provider, because the extractive one never escalates |
| `tests/engine/guardrails` | the §12 refusal policy, rule by rule, in both languages; the positive scope gate; NFR-04 output moderation |
| `tests/engine/verify` | FR-15 — invented fees and deadlines blocked, faithful paraphrase passed |
| `tests/engine/rationale` | rule-restated-as-its-own-reason; the stray-purpose-clause trap |
| `tests/engine/topicality` | R-07 — every bad answer this build shipped, as a regression case |
| `tests/engine/curated`, `glossary` | Tier 1 matching against the **live** corpus, not a fixture |
| `tests/engine/freshness` | FR-26 / M-05, with the clock injected |
| `tests/retrieval/query` | FR-07 follow-up anchoring — including that the query walks back *past* subject-less turns and keeps them |
| `tests/retrieval/fusion` | BM25, RRF, the hashed-n-gram embedder, the reranker |
| `tests/khmer/normalize`, `romanize` | FR-04/FR-05 canonical ordering and idempotence; FR-03 romanised Khmer, and that `prakas` is not mistaken for it |
| `tests/lang/content` | the shared content-word test retrieval and topicality must not drift apart on |
| `tests/lang/stem` | FR-05 suffix stripping: the inflections that were losing matches, the prefix property `topicality` depends on, over-stemming guards, and that no stem reaches citizen-facing text |
| `tests/llm/prompt` | the grounded vs general prompt contracts, and `parseGeneration` refusing to fabricate |
| `tests/llm/provider` | NFR-09 degradation, and that no metadata path exposes a credential |
| `tests/llm/gateway` | the provider actually in production: request shaping, bearer-only credential, honest residency |
| `tests/log/audit` | FR-56 — that the writers redact *before* the write |
| `tests/history` | device-local storage, quota and private-browsing failure, and that nothing is transmitted |
| `tests/api/routes` | the boundary: malformed, oversized and hostile input, and NFR-09 degradation |
| `tests/kb/corpus` | FR-45 metadata on every chunk, and the `data/README.md` honesty conventions |

Coverage thresholds are a **floor**, set in `vitest.config.ts` just below the
current numbers: an ordinary change has room to move, but deleting a suite fails
the build rather than showing up as a slowly sinking percentage nobody reads.
`lib/llm/anthropic.ts` and `lib/llm/vllm.ts` sit near 5% and are what hold the
figure below 90 — they are the Phase 1 migration targets (NFR-18), worth
covering when one of them becomes the provider in use, not before.

The corpus suite is the one to watch. It runs against live `data/` on every push,
because the corpus is the part of this system that changes without a code review
— it fails on a placeholder fee, an invented instrument number, a chunk with no
FR-44 questions, a non-public sensitivity, or a `[SAMPLE]` marker outside the
declared quarantine. The quarantine is exact: the eight `MOI-CR-*` chunks are
named, and both adding sample content elsewhere *and* replacing that file with
real content will fail until the list is updated deliberately.

`npm run verify-check` — 8/8 cases behave as specified: invented deadlines, fees,
document counts, and fabricated citation ids are all blocked; faithful
paraphrases and number-form changes ("thirty days" ⇄ "30 days") pass.

`npm run rationale-check` — 31/31 cases. Asks-for-a-reason detection in English,
Khmer and romanised Khmer; purpose clause vs. procedural infinitive; and the
gate itself, including the stray-purpose-clause case that documents why
`tiers.ts` must pass only the top source.

`npm run scope-check` — 22/24 routed as specified, plus **2 declared known
gaps**. A `knownGap` marker keeps a case that specifies the right behaviour but
does not yet hold: it is reported as `GAP`, excluded from the failure count,
and — if it ever starts passing — reported as `FIXD` and fails the run, so a
stale marker cannot quietly stop asserting what it was protecting. The two open
gaps are both retrieval precision, not routing; see Known gaps.

Two caveats stand on those numbers. M-04 is measured against ten negatives whose
by-gate breakdown is above: it does not contain the hard case, and there is a
live defect it cannot see. Read the first entry under Known gaps before quoting
it. A green M-04 means the ten negatives were refused, not that refusal is
solved.

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
npm run crawl:verify     # probe all 132 seeds, ~20 min, writes no content
npm run crawl:monitor    # change detection over confirmed sources
npm run crawl:weekly     # what the scheduled task runs: priority 1 and 2
```

Weekly scheduling on Windows, per-user, no admin rights:

```powershell
.\scripts\schedule-weekly.ps1              # Sunday 02:00 ICT by default
.\scripts\schedule-weekly.ps1 -Uninstall
```

### The registry

132 organisations — ministries, institutions, general departments, regulators,
25 provincial administrations, public universities, national hospitals, and the
two cross-government service portals (`service.gov.kh`,
`services.misti.gov.kh`). It is maintained in `data/registry/seed_registry.py`
and generated into `data/sources.json`; **do not edit `data/sources.json` by
hand.**

Every row carries a provenance code, and one value changes what the crawler is
allowed to do with it:

| `verified` | Meaning | Crawler behaviour |
|---|---|---|
| `directory` | From the official GDT directory at `tax.gov.kh/en/links` | Crawled |
| `wikipedia` | From the institution's Wikipedia infobox | Crawled |
| `search` | Seen verbatim on an official page or PDF | Crawled |
| `unconfirmed` | **Derived from a naming convention, never observed** | Probed by `crawl:verify`, skipped by `crawl:monitor` |

51 of the 132 are `unconfirmed` — mostly `<province>.gov.kh`, a pattern
confirmed for 7 of 25 provinces and assumed for the rest. They are leads, not
facts. `crawl:verify` is how a lead becomes a source: it probes the seed, and a
lead that returns 2xx with real content can then be promoted in the registry.
Nothing from an unconfirmed source enters change detection until that happens.

Two sources are disabled outright: `apps.customs.gov.kh` and
`digitalip.cambodiaip.gov.kh` are client-rendered SPAs where a static fetch
returns an empty shell. Recording that as "the page" would be worse than not
crawling them, so they wait for a headless adapter.

### A 200 is not proof of a page

The crawler's change signal used to rest on one assumption — an HTTP 200
carries the page — and on this infrastructure that assumption is wrong often
enough to poison the review queue. `lib/monitor/soft-block.ts` is the check that
was missing. Three shapes, all observed:

| Shape | Where | What it looked like before |
|---|---|---|
| WAF rejection page, HTTP 200 | 23 hosts, incl. MOJ, MFAIC, MoEYS, 18 provinces | `empty`, `robotsAllowsUs=true` — 155 chars of "The requested URL was rejected" |
| SPA catch-all, HTTP 200 on *every* path | `services.misti.gov.kh` | 40 "pages" that were all the same 2.5KB shell |
| JSON `{"status":"fail"}`, HTTP 200 | `services-api.misti.gov.kh` | an auth wall recorded as content |

The WAF case is the expensive one. Its rejection page embeds a fresh support ID
on every fetch, so its text hash changes every run: 22 hosts that can never be
read would each have raised a `modified` signal every week, forever. A review
queue that cries wolf weekly is a review queue nobody opens.

So `/robots.txt` is now sniffed rather than parsed on faith — a body with no
directives in it is not permission — and a WAF page there **fails closed**, on
the same reasoning as a 403. These hosts are up and serving citizens; they are
declining `AskGovBot` specifically. That is an access conversation with the
owning institution (§2.6), not a crawler setting, and deliberately not something
this crawler routes around: a browser `User-Agent` gets through, and spoofing
one to defeat another institution's access control is not a decision a crawler
config should be making.

### What a crawl can and cannot do

It writes to `data/crawl/`. It cannot write to `data/kb/` — there is no function
in `lib/monitor/` that could. A crawl raises change signals to
`data/crawl/review-queue.jsonl`; a steward publishes. That is FR-49 and §10.4's
closing line, and it is why this can be pointed at live government
infrastructure without any risk of unreviewed content reaching a citizen.

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
- **fail-closed on a 401/403 for `robots.txt` itself, and on a WAF page served
  in its place** — a host that will not show its rules is not inviting a guess,
  and a body with no directives in it is not a permissive `robots.txt`
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
| OpenAI-compatible gateway | `gateway` | Third-party gateway | External, non-domestic |
| Claude, commercial API | `anthropic` | External | Outside Cambodia |
| Qwen via vLLM | `vllm` | DGC infrastructure | Cambodia |
| Deterministic extraction | `extractive` | In-process | Cambodia |

**Currently configured: `gateway`.** One credential fronts many model families,
which is what §10.6 condition 4 needs for benchmarking candidates against the
Khmer golden set — swapping the model under test is one environment variable.
It is also a *third party* between AskGov and the model vendor, so it carries
the same NFR-11 limits as the direct vendor API and reports its residency
honestly. Do not present it as domestic.

Two things this layer has already caught, worth knowing before you touch it:

- A credential for one provider set under another provider's variable produces a
  401 on every request, and NFR-09 then degrades to extraction *silently*. The
  service keeps answering, from retrieved text only, and nothing looks broken.
  Check `provider` in `/api/health` and in the audit log, not just that answers
  appear.
- Model families differ on the same prompt. A prompt rule that holds on one and
  not another is not a rule; §10.6 condition 6 requires revalidation, and
  `npx tsx scripts/scope-check.ts` is how it is done here.

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

See `.env.example`. Three settings are governance decisions rather than tuning
knobs:

- **`RETRIEVAL_MIN_SCORE`** — the FR-16 escalation floor, default `0.20`. Derived
  from the sweep `npm run eval` prints, not chosen by feel. **Re-derive this
  whenever the corpus, the segmenter, or the reranker changes.** At 0.20 the
  starter set answers 67.6% of in-scope questions and refuses 90% of
  out-of-scope ones — the one that gets through is "what is the capital of
  france", which matches a vehicle-registration passage at 0.205. The system
  still refuses it, because the §6.1 off-domain screen runs *before* retrieval;
  but a scope rule must not depend on a retrieval score, which is exactly why it
  runs there.
- **`GENERAL_FALLBACK_ENABLED`** — default on. When a question is in scope and no
  approved source covers it, the model answers from its own knowledge, labelled
  unverified, with no citations and the officer still offered. Off is the §13
  behaviour: no approved source, no answer. On is a deliberate loosening while
  the corpus is four ministries of sample content, and it should be revisited as
  coverage grows — the wider the corpus, the more likely a question that misses
  it is one that genuinely should not be answered.
- **`DIAGNOSTICS_ENABLED`** — FR-72/73. When false the server omits the
  diagnostic payload entirely, so retrieval internals never cross the network.
  See gaps: this is not yet a role check.

Gateway tuning: `LLM_GATEWAY_MODEL` selects the model, `LLM_GATEWAY_TIMEOUT_MS`
the request deadline (default 30s). Khmer answers cost several times the output
tokens of the same answer in English and the unsourced fallback writes from
scratch rather than condensing a supplied provision; together they exceeded 30s
on a reasoning-family model, and the abort surfaced as an ordinary refusal.
Prefer a faster model over a longer wait — NFR-06 is a latency budget.

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

Note what this means for M-04 above. Refusal precision measures 100%, and that
number is real, but the by-gate breakdown says where it comes from: `policy 8 ·
scope 1 · floor 1`. Eight are §12 policy cases caught by regex before retrieval,
so trivially refused; one is caught by the scope gate; exactly one rests on the
floor. **The set contains no plausible adjacent-ministry service question** —
the hard case — so the metric cannot currently see this failure.

`npm run scope-check` carries two live instances of it as declared `knownGap`
cases, reported as `GAP` rather than counted as failures:

| Case | What happens | Should happen |
|---|---|---|
| "how do i enrol my child in school" | answered from civil-registration content | coverage gap, offer the officer |
| "where in phnom penh?" after a passport thread | drifts to driving-licence locations | coverage gap, offer the officer |

They are marked rather than deleted so the specification survives, and the
marker itself is checked: if either starts passing, scope-check reports `FIXD`
and fails until the marker is removed. Both close the same way this section
describes — retrieval precision, not routing.

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
  lang/                     detect (reply script) · content (shared content words)
  registry/csv.ts           RFC 4180 reader/writer for the source registry
  retrieval/                bm25 · embed · rrf · rerank · orchestration
  engine/                   tiers · curated · glossary · guardrails · verify · freshness
  llm/                      provider contract · gateway · anthropic · vllm · extractive
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

---

## Deployment

Running at `http://206.189.88.178` on a DigitalOcean droplet (Ubuntu 24.04,
1 vCPU, 1 GB). nginx terminates the public request; Next.js listens on loopback
only and is never reachable from outside.

```
internet → nginx :80 → 127.0.0.1:3000 (askgov.service, user askgov)
```

| Control | Where | Why |
|---|---|---|
| `limit_req` 12 r/min on `/api/`, 120 r/min site | `/etc/nginx/conf.d/askgov-limits.conf` | Every `/api/ask` is a paid model call. Unlimited public access is an open tap on the gateway credit. A citizen asks a question every few seconds; a scraper does not. |
| App bound to `127.0.0.1` | `askgov.service` | Port 3000 is unreachable publicly, so the rate limits and headers cannot be bypassed |
| `/api/health` → localhost only | nginx `location = /api/health` | It names the provider, the model and the gateway base URL. No client calls it |
| `DIAGNOSTICS_ENABLED=false` | `/opt/askgov/.env.local` | FR-72/73 — the answer trace is for DGC and ministry users, not citizens |
| `.env.local` mode 600, owned by `askgov` | droplet | R-15 / FR-74 — the credential is readable only by the service account |
| Unprivileged user + systemd sandboxing | `askgov.service` | `ProtectSystem=strict`, `NoNewPrivileges`, `PrivateDevices`; the audit log is the only writable path |
| `X-Powered-By` stripped, `server_tokens off` | nginx + `next.config.ts` | Do not hand a scanner the stack |
| `robots.txt` disallows `/api/` | nginx | A crawler walking the API costs a model call per hit |
| ufw: 22, 80, 443 only · key-only SSH · fail2ban | droplet | Standard host hardening |

**This deployment is HTTP, not HTTPS.** A certificate needs a domain name;
Let's Encrypt will not issue for a bare IP. Until a domain points here, citizen
questions — which section 5.1 notes are about births, deaths, lost documents and
money owed — cross the network in cleartext. Point a domain at the droplet and
run `certbot --nginx`, and treat the current address as a demo, not a pilot.

Operations:

```
systemctl status askgov          # service state
journalctl -u askgov -f          # application log
curl -s localhost/api/health     # provider, model, corpus (localhost only)
```

Redeploy: rsync the tree to `/opt/askgov` excluding `node_modules`, `.next`,
`var` and `.env.local`, then `npm ci && npm run build && systemctl restart
askgov`.
