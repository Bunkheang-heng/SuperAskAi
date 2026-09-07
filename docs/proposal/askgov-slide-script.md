# AskGov — Phase 1 Executive Case
**Slide script for PowerPoint / Google Slides.** Source: AskGov BRD v0.1, 12 Aug 2026.
Each slide = title, on-slide bullets, and a `SAY:` speaker note. Keep on-slide text to the bullets; the `SAY:` line is spoken, not projected.

---

## 1 — Title
- **AskGov**
- *A government answer service that refuses to guess.*
- Phase 1 proposal for decision · Digital Government Committee
- Source: BRD v0.1, 12 Aug 2026 · From: BA Team, DGC
- Decision required: direction, mandate, two policy defaults

---

## 2 — One sentence
- A Cambodian citizen asks, in Khmer, **what to bring, what it costs, how long it takes, which office** — and gets an answer a ministry has approved, with the instrument printed underneath.
- **Access** — free, no registration, any hour, Khmer and English
- **Where** — a mini-app in the DG Super App, and a standalone web application on a government domain
- **The constraint** — it answers only from approved government sources; where it has none, it declines and hands the citizen to an officer

`SAY:` Everything else in this paper follows from the third bullet. It is the reason this is a government service and not a chatbot.

---

## 3 — This is not a new idea. It is existing policy, delivered.
- **Cambodia Digital Government Policy 2022–2035** — quality of life and public confidence through better public service
- **Cambodia Digital Economy and Society Policy Framework 2021–2035** — digital citizens, digital government
- **Pentagonal Strategy, Phase 1** — human capital and the digital economy
- None of these is served by a citizen who cannot find out what documents a birth certificate requires

`SAY:` We are not asking the Committee to adopt a new direction. We are asking it to instruct on one it has already adopted.

---

## 4 — Three ordinary days that go wrong
- **Mala, new mother** — needs a birth certificate. Doesn't know a statutory deadline exists, that late registration is a different procedure, or which office holds it. Learns the penalty at the counter.
- **Ratana, first passport** — doesn't know where passports are issued, the hours, the fee or the processing time. Takes an unpaid day off, arrives at the wrong office.
- **Sopheak, small trader** — first international shipment. Doesn't know prohibited items, the customs declaration or the tariff. Two trips.
- **In every case the correct answer already existed in an official document. In every case it did not reach the person who needed it.**

`SAY:` A second trip is transport, lost wages and, from a province, a lost day. The cost falls on the citizens least able to absorb it.

---

## 5 — Five reasons the answer does not arrive
| Cause | What it looks like | Consequence |
|---|---|---|
| Fragmentation | 100+ institutional sites, Facebook pages, Telegram channels, counter notices | Citizens can't tell what to trust and bypass the official channel |
| Invisibility | Much Khmer publication is an image of a notice, not searchable text | Technically public, practically unfindable |
| Staleness | A fee amended by Prakas two years ago still on a page nobody owns | Citizens act on superseded fees and deadlines |
| Non-publication | Court procedure, one-window delivery, social assistance exist only as officer knowledge | Highest-stakes procedures have the least information |
| No accountability | Nobody is formally responsible for accuracy of published procedural information | Errors have no owner and are not corrected |

---

## 6 — Inside government, this failure is invisible — and that is what sustains it
- Questions go to neighbours, not the state → **no record of what citizens are confused about**
- **No signal** when a procedural change failed to reach the public
- **No evidence base** for which service page to fix first
- Officers answer the same question thousands of times, **with no accumulation**
- We are **digitising services faster than we digitise the explanation of them** — every new online service adds questions to a channel that does not exist
- An informal intermediary market charges citizens for information the state publishes free, and its interest is that the procedure stays opaque

`SAY:` The demand data alone would be worth building. Today nobody in this government can answer "what are citizens failing to find out?" — because nobody is asking us.

---

## 7 — THE RULE (full-bleed slide, one statement)
> **A confident wrong answer about a fee, a deadline or an office is worse for a citizen than no answer at all.**

- Because the citizen acts on it: travels, pays, misses a deadline, loses money or a legal right
- So AskGov answers only from steward-approved content. Where it has no approved source, it declines and routes to an officer. **It never guesses.**
- This is a governance decision approved at leadership level, not an engineering preference — `BR-001 · BR-002 · G2`

---

## 8 — Three tiers, five gates
- **Tier 1 Curated** — steward-approved answer served verbatim, no model involved · target 50–70% at maturity
- **Tier 2 Sourced** — model composes only from retrieved approved text and cites it · 25–45%
- **Tier 3 Refusal** — plain explanation plus a human officer or named office. Never a dead end · 5–10%

**The five gates:**
1. **Refusal policy** — before any retrieval or model call `FR-13`
2. **Confidence floor** — weak retrieval means no generation at all `FR-19`
3. **Topicality** — a high-ranked but off-subject source is withheld `FR-20`
4. **Verification** — every figure, date and citation checked against the source; unsupported → **answer suppressed entirely**, never corrected `FR-22 · BR-004`
5. **Moderation** — anything drifting into advice is suppressed `FR-23`

`SAY:` Gate 4 is the one that matters to you. A fabricated fee cannot reach a citizen even when the model produces one.

---

## 9 — Every answer carries its instrument
- Citation block on every sourced answer: **institution · document · instrument reference · article · link · effective date · last verified · freshness state**
- "Where do I go" answered from a **verified office directory** — name, address, hours, phone, map — never inferred from document prose. Placeholder values never publish `FR-30 · BR-020`
- **Deadlines** surfaced prominently wherever a source states one `FR-33`
- **Fees** never shown without currency, effective date and citation `FR-34`
- **Stale sources** carry a visible notice and downgraded confidence `FR-29 · BR-022`

---

## 10 — What AskGov will never do — and why that protects you
- **Refused by approved policy:** emergencies (terminal, verified numbers) · personal case lookup · legal advice · prediction of official decisions · land disputes · individual tax computation · **political commentary** · complaint intake · non-government questions
- **Outside the service entirely:** does not transact, take payment or book appointments · does not replace official publication · never cites a news outlet, private firm or broker site

`SAY:` Every one of those is a headline we have decided in advance not to generate. The refusal policy is approved as a governance instrument at leadership level — so no engineer owns that decision, and no engineer can change it.

---

## 11 — Two channels, one engine
- **DG Super App mini-app** — the promoted route. Mobile only, presupposes a super app account. Brings a high-demand service into the super app as a first-use entry point `IS-24 · G12`
- **Standalone web** — registered government domain, handset through desktop. The **only** route on a laptop and the **only** fully anonymous route `IS-25 · BR-030`
- One engine, one corpus, one set of governance controls. Channel changes packaging — never what AskGov answers, refuses, cites or escalates `FR-72 · FR-80`
- In Phase 1 AskGov does not receive, request, store or infer a super app identity `FR-82`
- Mini-app is gated by the super app release cycle; the channels are deliberately independent so a freeze on one can't block the other `NFR-32 · OD-10 · D-06`

---

## 12 — The audience is mobile, Khmer-speaking and Facebook-first
- **12.0M** internet users, end 2025 — **67.3%** of the population
- **14.0M** social media identities, Oct 2025 — **77.9%**
- **~14.4M** Facebook accounts, Jan 2025

**Three consequences:**
- **Mobile-first is the specification**, not a preference — low-cost Android on mobile data is the target device `NFR-07 · NFR-31`
- **Ministries announce on Facebook and Telegram before, or instead of, their websites.** So we monitor designated official channels — but a social post is a *change signal*, never a citable authority unless formally designated `IS-26 · BR-024`
- **Khmer costs more output tokens than English** — measure latency and cost in Khmer, don't extrapolate from English `NFR-06`

---

## 13 — The quality bar you would be signing
| Ref | Measure | Target | Failing it means |
|---|---|---|---|
| M-01 | Groundedness, human-graded on a sample | ≥ 95% | A citizen is misled by an answer that looks sourced |
| M-02 | Uncited factual claims | ≤ 1 per 100 | Assertions with nothing behind them |
| — | **Fabricated fee, deadline, office or citation reaching a citizen** | **ZERO** | The defining failure the project exists to prevent |
| M-03 | Retrieval recall on the golden set, per language | ≥ 85% | Coverage we have is invisible to the citizen |
| M-04 | Refusal precision vs adjacent-ministry questions | ≥ 98% | One ministry's rules served as another's |
| G3 | Khmer-to-English quality gap | ≤ 5 pts | Khmer speakers served the lesser system |
| G1 | Containment without escalation | ≥ 55% | Officer channel overwhelmed, G4 fails publicly |
| NFR-06 | Latency p95 / time to first token | [confirm] s / <1s | Abandonment on a weak provincial connection |

---

## 14 — Launch will not look like maturity
- The 5–10% refusal target describes a **mature corpus**, after many institutions onboard
- **At launch, with Group 1 content only, expect Tier 3 refusal around 30–50%** of in-scope questions — correct behaviour, not a defect
- It converges as institutions onboard and curated answers accumulate
- *Estimate, not measurement* — derived from launch corpus size; validate against the golden set on the prototype before quoting it

`SAY:` If the Committee is told to expect 5–10% refusal at launch, this project will be judged a failure in month one for behaving exactly as designed. I am asking for two targets — a launch target and a maturity target — reported separately.

---

## 15 — The critical path is content, not software
| Stage | Activity, one institution | Duration |
|---|---|---|
| 2 | Sponsor-level introduction under the mandate | 2–4 wk |
| 3 | Demonstration to institutional leadership | 2–4 wk |
| 4 | Working-level scoping with the service owner | 3–6 wk |
| 5 | Legal review, both sides | 4–12 wk |
| 6 | Signature at the agreed authority level | 2–6 wk |
| 7 | Steward designation and training | 2–4 wk |
| 8 | Content acquisition — Modes A/B/C | 4–16 wk |
| 9 | Steward approval and pilot release | 2–4 wk |
| **Σ** | **Introduction to public release** | **21–56 weeks ≈ 5–13 months** |

- **Parallel from day one:** mandate month 0, four institutions engaged together → earliest launch with real content **month 6–8**, Group 1 complete **month 9–13**
- **Engagement after the build:** add **6–12 months of a finished product with nothing in it** — the single most likely way this embarrasses us

`SAY:` The software is a matter of months. The instruments are a matter of quarters. That is why the first ask is a signature, not a budget.

---

## 16 — Three acquisition modes, and where the value is
| Mode | Applies to | Method | Cost |
|---|---|---|---|
| **A Monitor** | Already published on an official site or designated channel | Automated monitoring, change detection, steward review | Low |
| **B Transfer** | Held but unpublished — circulars, service standards, counter notices, forms | Structured handover under MoU, ingestion, steward approval | Medium |
| **C Co-create** | Exists only as officer practice, never written down | Working sessions with front-line officers, field capture, drafting, legal review | High |

- **Mode C is the differentiator.** For those procedures AskGov is not competing with an existing information source — **it is creating the only one.**
- It is also where the political sensitivity lives. That trade-off is the direction choice on slide 20.

---

## 17 — PROS: six reasons to proceed
1. **Political safety is designed in** — the defining behaviour is refusal, defensible in advance, in writing, at leadership level
2. **It delivers existing policy** — no new mandate to justify it, only an instruction to execute one already adopted
3. **It uses Cambodian capability** — Sarika Khmer TTS at Phase 1; provider abstraction so the model moves to domestic inference by configuration `IS-27 · FR-71`
4. **It creates a dataset government has never had** — what citizens ask and what we cannot answer, by ministry and province. Leadership value independent of the chatbot `G7`
5. **It is fundable** — governance and justice development partners fund exactly this: Mode C acquisition, translation, evaluation `CA-08`
6. **It gives the DG Super App a reason to be opened** — a first-use entry point and repeat-use driver, reported monthly against baseline `G12`

---

## 18 — CONS: what can actually go wrong, ranked
| # | Risk | Damage | Likely | Mitigation · Owner |
|---|---|---|---|---|
| 1 | **A wrong answer goes viral.** One incident costs more trust than a year of correct answers earns | Severe | Med | Verification gate; zero-fabrication metric; unsourced answers OFF at launch; incident playbook signed before release · Product Owner |
| 2 | **Stewards designated without real capacity.** Content goes stale, trust decays quietly | Severe | **High** | Service Level Annex in every MoU; Steward Performance Report; BR-025 — no steward, no publication · Partnerships Lead |
| 3 | **Content not ready when software is** — a finished product with nothing in it | High | **High** | Parallel tracks from day one; publish partial coverage rather than delay · Sponsor |
| 4 | **Escalation channel can't absorb volume** — refusals become dead ends, G4 fails publicly | High | Med | Officer-side handler is a release blocker; named-office fallback; FR-40 forbids claiming a handover that didn't happen · DG Support Lead |
| 5 | **Publishing the rule reveals the counter does something different** | Med-High | **High** | Agree in the MoU *in advance* that discrepancies route to the institution, never to citizens; a service improvement finding, never an accusation · CA-02 |
| 6 | **Model residency exposure in the interim** | Med-High | Med | Provider abstraction; residency reported accurately, never described as domestic; dated migration commitment · BR-018 |
| 7 | **Justice content read as legal advice** | Severe | Med | BR-014 boundary; item-by-item legal review; specialist panel; mandatory referral route · CA-03 |
| 8 | **Mini-app blocked by super app release cycle** | Med | Med | Channel independence; web launches alone if the slot slips · OD-10, D-06 |
| 9 | **Mode C cost exceeds budget** | Med | Med | Partner co-funding; prioritise by the six-criterion score; publish partial coverage · CA-08 |
| 10 | **Success creates demand for what we refuse** ("where is my application") | Med | **High** | Say Phase 4 openly from launch; count requests as evidence for the next BRD · Product Owner |

`SAY:` Risks 2 and 3 — the two most likely — are not software risks. Neither can be solved by the delivery team. Both are solved by the mandate.

---

## 19 — Seven political considerations for our landscape
1. **The mandate converts every conversation.** Without a Royal Government / Council of Ministers instruction or inter-ministerial circular, every MoU is a request for a favour. With one, it is an implementation discussion. Highest-leverage action available to the sponsor `D-01`
2. **Approach the policy owner first, always.** Ministry mandate → general department → external partners under that mandate. Going to front-line officers, the Bar Association or a development partner first reads as bypassing the institution and costs the relationship permanently.
3. **Frame the intermediary problem without accusation.** The defensible sentence is *"citizens pay for information the state publishes for free."* Same fact, verifiable, names no one.
4. **Political neutrality is existential, not cosmetic.** A service carrying the Committee's name that comments on politics, named officials or contested land disputes becomes a headline. Hence refusal as a leadership-approved governance instrument, not a setting `OD-07 · BR-001`
5. **Sovereignty is an asset, not only a constraint.** Sarika at Phase 1 plus a credible **dated** domestic-inference path lets the sponsor call this Cambodian capability rather than a foreign system in national colours.
6. **Sub-national reality will contradict national content.** A national answer wrong at a district counter damages the institution that supplied it. Build the "state the applicable administration, or that local variation exists" rule in before Group 4, not after the first complaint `BR-028`
7. **Give institutions the credit, and give the content back.** Every answer names the ministry; approved content is exported for the institution's own channels, so AskGov is never the sole location of public procedural information. That clause turns a perceived threat into a service — it is why institutions sign `BR-027 · FR-52`

---

## 20 — THREE DIRECTIONS. Pick one.
| | **A · Lighthouse** | **B · Breadth** | **C · Flagship** |
|---|---|---|---|
| **Scope** | Group 1 only — civil registration & identity, travel documents, postal, transport | Groups 1+2 — nine domains incl. commerce, tax, immigration, education, labour | Group 1 launch **plus** a Mode C justice / social protection workstream started now |
| **Channels** | Web first; mini-app when a slot allows | Both at launch | Web first |
| **Modes** | A and B | A and B | A, B and C |
| **Institutions to sign** | 3–4 | 9–10 | 3–4 plus Ministry of Justice as anchor |
| **Earliest launch** | **Month 6–8** | **Month 10–14** (set by 10 parallel legal reviews, not software) | Month 6–8 for Group 1; **first justice content month 12–18** |
| **Political exposure** | Low | Medium | **High** — needs the specialist legal panel and CA-02/CA-03 mitigations agreed first |
| **Cost** | Lowest | High — steward training, MoU legal capacity, escalation capacity all multiply | Highest — and the most fundable by development partners |
| **What it proves** | The pipeline, the five gates, the steward workflow, the metrics — measured on real citizens for the first time | National scale and the strongest super app adoption story | That the state can make navigable a procedure never documented anywhere |
| **Main failure mode** | Reads as "just an FAQ bot"; does nothing about information poverty | Launches thin across many domains instead of complete in a few; escalation outruns DG Support | Read as legal advice; or officer time never released and the workstream stalls having spent relationship capital |

---

## 21 — Recommendation: launch on A, start C in parallel, defer B
- **A is the only direction producing a defensible public launch inside a year**, and it is where the quality metrics are first measured on real citizens. Do not scale a pipeline that has never run.
- **But Mode C takes 12–18 months, and its early stages cost the delivery team nothing.** Stages 2–6 are introductions, demonstrations, scoping and legal review — meetings and paperwork that do not compete with the engineers. Starting justice engagement only after Group 1 launches loses a year for no saving.
- **B is not a direction; it is a consequence.** Breadth arrives by adding institutions to a proven pipeline, not by signing ten memoranda before the pipeline exists.
- **A is the launch. C is the reason the project matters. B is what year two looks like if A works.**

`SAY:` The only irreversible decision in front of the Committee today is the one about time. Signing the mandate now and opening the justice conversation this quarter costs nothing and saves a year. Everything else can be adjusted later.

---

## 22 — Two policy defaults, required whichever direction is chosen

**Decision 1 · `OD-08 / FR-26` — May AskGov answer an in-scope question with no approved source, from general model knowledge, marked unverified?**

| | ON | **OFF (recommended)** |
|---|---|---|
| Coverage at launch | Substantially higher | Limited to the approved corpus |
| What the citizen gets when we have no source | An unverified answer about a fee or deadline, no citation, but carrying the government's name | A plain refusal, an explanation, and a human officer |
| Consistency with slide 7 | Contradicts it | Is it |
| Reversibility | — | Can be switched on later once groundedness is measured. **A fabricated fee cannot be switched off.** |

→ **Recommend OFF at public release; revisit after two quarters of production groundedness data.**

**Decision 2 · `OD-03 / OD-05 / NFR-12` — Where does the language model run?**

| | **External provider now (recommended, with conditions)** | Wait for domestic inference |
|---|---|---|
| Time to launch | No delay | Adds the full capability-build period |
| Political exposure | Citizen questions processed abroad — attackable, and fairly so | None |
| Cost shape | Operating cost per answer, rising with volume | Capital and capability investment up front |
| Switching cost later | Low — the provider abstraction is a Phase 1 requirement `FR-71` | n/a |

→ **Three conditions:** residency reported accurately and never described as domestic `BR-018`; a **dated migration commitment** recorded in the decision; provider substitution **demonstrated in test before launch** `G11`, so the switch is proven rather than promised.

---

## 23 — Numbers the Committee should set today
| Ref | Target to set | Why it can't stay blank |
|---|---|---|
| G1 | Monthly question volume by end of Phase 1, per channel; 90-day return rate | No definition of success, no basis for capacity planning |
| G4 | % of escalations answered, within how many working hours | Sets the DG Support staffing requirement — a release blocker |
| G6 | % of priority-1 sources checked on schedule; median steward review turnaround | Becomes the Service Level Annex in every MoU — needed before the first signature |
| G10 | Institutions under signed instrument by end of Phase 1 | The direction choice on slide 20, expressed as a number |
| NFR-06 | Latency p95, **measured in Khmer** | Drives model selection and hosting cost |
| NFR-08 | Monthly availability | Drives hosting architecture and on-call |
| NFR-27 | RPO and RTO | Drives backup design and cost |
| — | A separate **launch** refusal-rate target, distinct from maturity | Prevents the project being judged a failure for working correctly |

---

## 24 — What we need from you
1. **The programme mandate** — a Royal Government / Council of Ministers instruction or inter-ministerial circular establishing AskGov as a national programme and directing institutions to cooperate `D-01 · Sponsor`
2. **The Inter-Ministerial Steering Committee**, with terms of reference `D-02 · Sponsor`
3. **Approval of the refusal policy as a governance instrument** `OD-07 · Leadership`
4. **A decision on the two policy defaults** — unsourced answers, and model residency `OD-08 · OD-03/05`
5. **Confirmation of the Phase 1 launch service set** `OD-01 · Product Owner`
6. **A budget line that funds content acquisition, not only software** `CA-08`
7. **Engagement with the DG Super App team and a mini-app release slot** `OD-10 · D-06`
8. **Authority to open the Ministry of Justice conversation this quarter**, ahead of any justice content decision `Direction C`

---

## 25 — The first ninety days, if approved
| Weeks | Activity | Owner |
|---|---|---|
| 1–2 | Mandate instrument drafted and submitted; Steering Committee ToR drafted | Sponsor / Legal |
| 1–4 | Refusal policy tabled for approval; both policy defaults recorded as decisions | Product Owner |
| 2–6 | Sponsor-level introductions to the four Group 1 institutions; Ministry of Justice introduction opened | Partnerships Lead |
| 2–12 | Golden question set built *with the officers who answer these questions today* — min. 300 questions incl. adjacent-ministry negatives | BA Team `A-03` |
| 4–12 | MoU template and annexes into institutional legal review | Legal Adviser |
| 4–12 | Office directory — addresses, hours, phone numbers verified **in writing** | BA Team `D-04 · BR-020` |
| 6–12 | Content portal and answer engine build; provider substitution demonstrated in test | Technical Lead |
| 12 | **Report to the Committee** — instruments in flight, golden set complete, first steward designated, prototype demonstrated live in Khmer | BA Team Lead |

---

## 26 — Closing
> **The correct answer already exists. Our job is not to invent it.**

- It is in a Prakas, a sub-decree, a service standard, or in the head of the officer standing at the counter
- AskGov's job is to carry it — unchanged, with its source attached — to the citizen who needs it, and to say so plainly when it cannot
- **The decision in front of the Committee is not whether the technology works.** It is whether the government will instruct its institutions to release what they already know, and to whom that instruction is addressed.

---

# Appendix (hold in reserve, use if challenged)

## A — Open decisions, dependencies and assumptions carried in BRD v0.1
`OD-01` launch service set · `OD-03` domestic inference requirement and timing · `OD-05` model procurement route and licence · `OD-07` refusal policy approval · `OD-08` unsourced-answer default · `OD-09` liability and disclaimer position · `OD-10` mini-app framework and release process
`D-01` programme mandate · `D-02` Steering Committee · `D-03` officer-side handover handler · `D-04` verified office directory · `D-05` human grading capacity · `D-06` super app release slot
`A-01` **stewards with real capacity** (the assumption that fails silently) · `A-02` verified emergency numbers · `A-03` 300-question golden set · `A-04` registered government domain · `A-05` officer time released for co-creation · `A-06` Sarika TTS integration

## B — Onboarding groups
- **Group 1 (Phase 1 launch)** — civil registration & identity · travel documents · postal services · transport. Modes A/B. High volume, comparatively documented, and covers the three question types the service must handle from day one: a procedure, a deadline, and an office location.
- **Group 2 (extension)** — commerce · taxation · immigration · education · labour and social security. Modes A/B.
- **Group 3 (Phase 2 flagship)** — justice (court filing, criminal record, notarial acts, legal aid, appeal periods) · land and construction · social protection · health. Modes B/C. Highest consequence, highest information poverty, highest broker exposure.
- **Group 4 (Phase 3)** — sub-national and one-window services. Mode C. The largest body of undocumented practice in the country.

## C — Where each number came from
**Verified external sources**
- Internet users / penetration, end 2025 — DataReportal, *Digital 2026: Cambodia* — https://datareportal.com/reports/digital-2026-cambodia
- Social media identities, Oct 2025 — DataReportal, *Digital in Cambodia* — https://datareportal.com/digital-in-cambodia
- Facebook accounts, Jan 2025 — NapoleonCat — https://stats.napoleoncat.com/facebook-users-in-cambodia/2025/01/
- Digital Government Policy 2022–2035 — RGC / MPTC — https://asset.cambodia.gov.kh/mptc/media/Cambodia_Digital_Government_Policy_2022_2035_English.pdf

**Generated inside this deck — validate before quoting**
- The 21–56 week engagement total (slide 15) is arithmetic on the BRD's own stage durations.
- The 30–50% launch refusal range (slide 14) and the month 6–8 / 10–14 / 12–18 launch windows (slides 15, 20) are **estimates** derived from those durations and the launch corpus size — **not measured figures**. Validate against the prototype and the golden set before quoting them anywhere they will be held to.
- Every other number is taken directly from BRD v0.1.
