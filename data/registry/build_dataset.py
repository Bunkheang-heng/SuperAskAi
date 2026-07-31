# -*- coding: utf-8 -*-
"""Build the AskGov government-website deliverables from seed_registry.py."""
import json, csv, datetime, os
import pandas as pd
from seed_registry import SEED, PROVINCES, UNIVERSITIES, HOSPITALS

OUT = "/mnt/user-data/outputs"
os.makedirs(OUT, exist_ok=True)
TODAY = datetime.date.today().isoformat()

COLUMNS = [
    "id","organization_name","khmer_name","abbreviation","category","organization_type",
    "government_level","parent_organization","parent_ministry","website","domain","subdomain",
    "base_url","homepage_title","description","language","province","city","address",
    "latitude","longitude","phone","email","facebook","youtube","telegram","linkedin","twitter",
    "logo_url","favicon_url","cms","server","hosting_provider","ssl","https","robots_txt",
    "robots_url","sitemap","sitemap_url","rss","rss_url","search_available","api_available",
    "api_url","open_data","last_updated","first_seen","status","http_status","crawl_priority",
    "estimated_pages","estimated_documents","pdf_count","word_count","notes",
    # extensions beyond the requested schema, required for an auditable seed:
    "source_evidence","verified",
]

# Columns that CANNOT be filled without fetching the live site. Left empty here;
# enrich_crawler.py populates them.
CRAWL_FILLED = [
    "homepage_title","latitude","longitude","logo_url","favicon_url","cms","server",
    "hosting_provider","ssl","https","robots_txt","robots_url","sitemap","sitemap_url",
    "rss","rss_url","search_available","api_available","api_url","open_data","last_updated",
    "status","http_status","estimated_pages","estimated_documents","pdf_count","word_count",
]

rows = []
_id = 0

def blank():
    return {c: "" for c in COLUMNS}

def host_parts(domain):
    """Split a host into registrable domain vs subdomain for .gov.kh / .edu.kh / .org.kh."""
    labels = domain.split(".")
    for suffix in ("gov.kh", "edu.kh", "org.kh", "com.kh"):
        s = suffix.split(".")
        if labels[-len(s):] == s:
            n = len(s) + 1                      # e.g. tax + gov + kh
            reg = ".".join(labels[-n:]) if len(labels) >= n else domain
            sub = ".".join(labels[:-n]) if len(labels) > n else ""
            return reg, sub
    return domain, ""

def add(**kw):
    global _id
    _id += 1
    r = blank()
    r.update(kw)
    r["id"] = _id
    dom = r["domain"]
    reg, sub = host_parts(dom)
    r["domain"] = reg
    r["subdomain"] = sub
    r["website"] = f"https://{dom}"
    r["base_url"] = f"https://{dom}"
    r["first_seen"] = TODAY
    for c in CRAWL_FILLED:
        r[c] = ""
    rows.append(r)

# ---- core institutions ----------------------------------------------------
for (name, kh, abbr, dom, cat, otype, lvl, parent, pmin, prov, city, ev, ver, prio, note) in SEED:
    add(organization_name=name, khmer_name=kh, abbreviation=abbr, category=cat,
        organization_type=otype, government_level=lvl, parent_organization=parent,
        parent_ministry=pmin, domain=dom, province=prov, city=city,
        language="km|en", crawl_priority=prio, notes=note,
        source_evidence=ev, verified=ver,
        description=f"{name} - official web property of the Royal Government of Cambodia.")

# ---- provinces ------------------------------------------------------------
for (name, kh, slug, iso, capital, ev, ver) in PROVINCES:
    lvl = "Municipal" if slug == "phnompenh" else "Provincial"
    cat = "Municipal Administration" if slug == "phnompenh" else "Provincial Administration"
    add(organization_name=name, khmer_name=kh, abbreviation=iso, category=cat,
        organization_type="Sub-national Administration", government_level=lvl,
        parent_organization="Ministry of Interior", parent_ministry="Ministry of Interior",
        domain=f"{slug}.gov.kh", province=name.split(" Provincial")[0].split(" Capital")[0],
        city=capital, language="km", crawl_priority=2,
        source_evidence=ev, verified=ver,
        notes=("Domain follows the confirmed <province>.gov.kh convention. "
               "Ministry of Information is separately standing up official sites for all 25 "
               "provincial information departments - re-run discovery after that rollout."),
        description=f"{name} ({iso}), capital {capital}.")

# ---- public universities --------------------------------------------------
for (name, kh, abbr, dom, pmin, city, ev, ver) in UNIVERSITIES:
    add(organization_name=name, khmer_name=kh, abbreviation=abbr, category="University",
        organization_type="Public Higher Education Institution", government_level="National",
        parent_organization=pmin, parent_ministry=pmin, domain=dom,
        province=city, city=city, language="km|en", crawl_priority=3,
        source_evidence=ev, verified=ver,
        notes="Public HEIs use .edu.kh, not .gov.kh. Ownership is public but the TLD is not "
              "a reliable officiality signal - verify accreditation against the MoEYS register.",
        description=f"{name} - public higher education institution under {pmin}.")

# ---- national hospitals ---------------------------------------------------
for (name, kh, dom, city) in HOSPITALS:
    add(organization_name=name, khmer_name=kh, abbreviation="", category="Hospital",
        organization_type="National Referral Hospital", government_level="National",
        parent_organization="Ministry of Health", parent_ministry="Ministry of Health",
        domain=dom, province=city, city=city, language="km", crawl_priority=3,
        source_evidence="CONVENTION", verified="unconfirmed",
        notes="Candidate domain only. Most Cambodian national hospitals have no independent "
              "site and are represented as pages under moh.gov.kh - confirm before crawling.",
        description=f"{name}, national referral hospital under the Ministry of Health.")

# ---- verified contact details gathered during discovery -------------------
# Only entries confirmed on an official page or an institution infobox.
CONTACTS = {
    "www.cambodiaip.gov.kh": dict(
        address="Ministry of Commerce, No. 19-61, Confederation de la Russie Blvd (110), Phnom Penh 12200",
        phone="023 866 114"),
    "dip.cambodiaip.gov.kh": dict(
        address="Ministry of Commerce, No. 19-61, Confederation de la Russie Blvd (110), Phnom Penh 12200",
        phone="023 866 114"),
    "digitalip.cambodiaip.gov.kh": dict(
        address="Ministry of Commerce, No. 19-61, Confederation de la Russie Blvd (110), Phnom Penh 12200"),
    "tax.gov.kh": dict(phone="023 266 668"),
    "interior.gov.kh": dict(address="275 Norodom Blvd (41), Phnom Penh"),
    "mfaic.gov.kh": dict(address="3 Samdech Hun Sen St., Phnom Penh 12207"),
    "moh.gov.kh": dict(address="80 Samdech Penn Nouth St. (289), Phnom Penh"),
    "mptc.gov.kh": dict(address="13 Monivong Blvd, Phnom Penh 12201"),
    "information.gov.kh": dict(address="62 Monivong Blvd, Phnom Penh"),
    "misti.gov.kh": dict(address="45 Preah Norodom Blvd, Phnom Penh 120203"),
    "mrd.gov.kh": dict(address="771-773 Monivong Blvd (93), Phnom Penh"),
    "mop.gov.kh": dict(address="386 Preah Monivong Blvd, Phnom Penh"),
    "mod.gov.kh": dict(address="Georgi Dimitrov Blvd, Phnom Penh 12156"),
    "apsaraauthority.gov.kh": dict(
        address="Bang Korng Village, Ampil Commune, Prasat Bakong District, Siem Reap"),
}
for r in rows:
    host = (r["subdomain"] + "." + r["domain"]).strip(".")
    if host in CONTACTS:
        r.update(CONTACTS[host])

df = pd.DataFrame(rows, columns=COLUMNS)

# ---- integrity checks -----------------------------------------------------
full_host = df.apply(lambda r: (r["subdomain"] + "." + r["domain"]).strip("."), axis=1)
assert full_host.duplicated().sum() == 0, "duplicate host detected"
assert df["organization_name"].duplicated().sum() == 0, "duplicate organization detected"

# ---- 1. CSV ---------------------------------------------------------------
df.to_csv(f"{OUT}/government_websites.csv", index=False, encoding="utf-8-sig")

# ---- 3. JSON (requested compact shape + full record) ----------------------
compact = [{
    "id": int(r["id"]),
    "organization_name": r["organization_name"],
    "khmer_name": r["khmer_name"],
    "category": r["category"],
    "parent": r["parent_organization"],
    "website": r["website"],
    "domain": r["domain"],
    "language": [l for l in r["language"].split("|") if l],
    "robots": r["robots_url"],
    "sitemap": r["sitemap_url"],
    "status": r["status"] or "Unverified",
    "verified": r["verified"],
} for _, r in df.iterrows()]
with open(f"{OUT}/government_websites.json", "w", encoding="utf-8") as f:
    json.dump(compact, f, ensure_ascii=False, indent=2)
with open(f"{OUT}/government_websites.full.json", "w", encoding="utf-8") as f:
    json.dump(df.to_dict(orient="records"), f, ensure_ascii=False, indent=2)

# ---- 4. PostgreSQL --------------------------------------------------------
TEXT_INT = {"id","crawl_priority","http_status","estimated_pages","estimated_documents",
            "pdf_count","word_count"}
TEXT_BOOL = {"ssl","https","robots_txt","sitemap","rss","search_available","api_available","open_data"}
TEXT_NUM = {"latitude","longitude"}

def sqltype(c):
    if c == "id": return "INTEGER PRIMARY KEY"
    if c in TEXT_INT: return "INTEGER"
    if c in TEXT_BOOL: return "BOOLEAN"
    if c in TEXT_NUM: return "NUMERIC(10,6)"
    if c == "language": return "TEXT[]"
    if c in ("first_seen","last_updated"): return "DATE"
    return "TEXT"

def esc(v):
    return "'" + str(v).replace("'", "''") + "'"

with open(f"{OUT}/government_websites.sql", "w", encoding="utf-8") as f:
    f.write("-- AskGov: Cambodian government website registry\n")
    f.write(f"-- Generated {TODAY}. Crawl-derived columns are NULL until enrich_crawler.py runs.\n\n")
    f.write("BEGIN;\nDROP TABLE IF EXISTS government_websites CASCADE;\n")
    f.write("CREATE TABLE government_websites (\n")
    f.write(",\n".join(f"    {c} {sqltype(c)}" for c in COLUMNS))
    f.write("\n);\n\n")
    for _, r in df.iterrows():
        vals = []
        for c in COLUMNS:
            v = r[c]
            if v == "" or v is None:
                vals.append("NULL")
            elif c == "language":
                vals.append("ARRAY[" + ",".join(esc(x) for x in str(v).split("|")) + "]")
            elif c in TEXT_INT or c in TEXT_NUM:
                vals.append(str(v))
            elif c in ("first_seen","last_updated"):
                vals.append(esc(v))
            else:
                vals.append(esc(v))
        f.write("INSERT INTO government_websites (" + ",".join(COLUMNS) + ") VALUES (" +
                ",".join(vals) + ");\n")
    f.write("""
CREATE UNIQUE INDEX ux_gw_host ON government_websites (COALESCE(subdomain,'') , domain);
CREATE INDEX ix_gw_category ON government_websites (category);
CREATE INDEX ix_gw_level ON government_websites (government_level);
CREATE INDEX ix_gw_parent ON government_websites (parent_ministry);
CREATE INDEX ix_gw_priority ON government_websites (crawl_priority);
CREATE INDEX ix_gw_verified ON government_websites (verified);
COMMIT;
""")

# ---- 5. crawl_seeds.csv ---------------------------------------------------
with open(f"{OUT}/crawl_seeds.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["id","organization_name","seed_url","domain","crawl_priority",
                "verified","render_mode","politeness_delay_s","max_depth","notes"])
    for _, r in df.iterrows():
        host = (r["subdomain"] + "." + r["domain"]).strip(".")
        # Hosts confirmed to be client-rendered SPAs: a static fetch returns an empty shell.
        SPA_HOSTS = {"apps.customs.gov.kh", "digitalip.cambodiaip.gov.kh"}
        render = "headless" if host in SPA_HOSTS else "static"
        w.writerow([r["id"], r["organization_name"], r["base_url"],
                    (r["subdomain"] + "." + r["domain"]).strip("."),
                    r["crawl_priority"], r["verified"], render, 2, 4, r["notes"]])

# ---- 6 & 7. sitemap / robots index (skeleton, filled by the crawler) ------
with open(f"{OUT}/sitemap_index.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["id","domain","sitemap_url","sitemap_type","url_count","last_modified",
                "http_status","discovered_at","discovery_method"])
    for _, r in df.iterrows():
        host = (r["subdomain"] + "." + r["domain"]).strip(".")
        w.writerow([r["id"], host, f"https://{host}/sitemap.xml", "", "", "", "", "",
                    "convention"])

with open(f"{OUT}/robots_index.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["id","domain","robots_url","http_status","exists","crawl_delay",
                "disallow_count","sitemap_directives","allows_askgov_ua","fetched_at"])
    for _, r in df.iterrows():
        host = (r["subdomain"] + "." + r["domain"]).strip(".")
        w.writerow([r["id"], host, f"https://{host}/robots.txt", "", "", "", "", "", "", ""])

# ---- 2. XLSX --------------------------------------------------------------
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "government_websites"
hdr_font = Font(name="Arial", bold=True, color="FFFFFF")
hdr_fill = PatternFill("solid", fgColor="1F3864")
pend_fill = PatternFill("solid", fgColor="FFF2CC")

ws.append(COLUMNS)
for j, c in enumerate(COLUMNS, 1):
    cell = ws.cell(row=1, column=j)
    cell.font = hdr_font
    cell.fill = hdr_fill
    cell.alignment = Alignment(vertical="center", wrap_text=True)
    if c in CRAWL_FILLED:
        cell.fill = PatternFill("solid", fgColor="7F6000")

for _, r in df.iterrows():
    ws.append([r[c] for c in COLUMNS])

for i in range(2, ws.max_row + 1):
    for j, c in enumerate(COLUMNS, 1):
        cell = ws.cell(row=i, column=j)
        cell.font = Font(name="Arial", size=10)
        if c in CRAWL_FILLED:
            cell.fill = pend_fill

widths = {"organization_name": 52, "khmer_name": 34, "description": 46, "notes": 70,
          "website": 34, "base_url": 34, "domain": 24, "parent_organization": 34,
          "parent_ministry": 34, "category": 22, "organization_type": 26}
for j, c in enumerate(COLUMNS, 1):
    ws.column_dimensions[get_column_letter(j)].width = widths.get(c, 16)
ws.freeze_panes = "C2"
ws.auto_filter.ref = ws.dimensions

# legend sheet
lg = wb.create_sheet("README")
legend = [
    ["AskGov - Cambodian Government Website Registry", ""],
    ["Generated", TODAY],
    ["", ""],
    ["HOW TO READ THIS FILE", ""],
    ["Amber-shaded columns", "Not yet populated. These require fetching the live site. Run enrich_crawler.py."],
    ["verified = directory", "URL and Khmer name taken from the official GDT directory at tax.gov.kh/en/links."],
    ["verified = wikipedia", "URL from the institution's Wikipedia infobox 'Website' field."],
    ["verified = search", "URL appeared verbatim in an official page or PDF during discovery."],
    ["verified = unconfirmed", "Domain DERIVED from naming convention. Treat as a lead, not a fact. Do not ingest before crawl-verification."],
    ["", ""],
    ["SCOPE NOTES", ""],
    ["Public universities", "Use .edu.kh. Publicly owned but the TLD is not an officiality signal."],
    ["National Assembly", "Uses national-assembly.org.kh (.org.kh), not .gov.kh."],
    ["National Bank of Cambodia", "Official directory lists nbc.org.kh; nbc.gov.kh also observed. Resolve canonical."],
    ["Excluded by design", "NGOs, political parties, private companies, unofficial mirrors."],
]
for row in legend:
    lg.append(row)
lg.column_dimensions["A"].width = 34
lg.column_dimensions["B"].width = 110
for i in range(1, lg.max_row + 1):
    lg.cell(row=i, column=1).font = Font(name="Arial", bold=True, size=10)
    lg.cell(row=i, column=2).font = Font(name="Arial", size=10)
    lg.cell(row=i, column=2).alignment = Alignment(wrap_text=True, vertical="top")
lg.cell(row=1, column=1).font = Font(name="Arial", bold=True, size=14)

wb.save(f"{OUT}/government_websites.xlsx")

# ---- 8. crawl_statistics.md ----------------------------------------------
by_cat = df["category"].value_counts()
by_lvl = df["government_level"].value_counts()
by_ver = df["verified"].value_counts()
by_prio = df["crawl_priority"].value_counts().sort_index()
tld = df["domain"].apply(lambda d: ".".join(d.split(".")[-2:])).value_counts()

def table(series, k, v):
    out = [f"| {k} | {v} |", "|---|---|"]
    out += [f"| {i} | {n} |" for i, n in series.items()]
    return "\n".join(out)

stats = f"""# AskGov - Crawl Statistics and Data-Quality Report

Generated: {TODAY}

## 1. What this dataset is

{len(df)} organization records covering Cambodian government web properties, assembled as the
seed layer for the AskGov RAG pipeline. Every record carries an explicit provenance code so
downstream ingestion can gate on confidence rather than treating all rows as equal.

## 2. What this dataset is NOT (read before ingesting)

This is a **verified-provenance seed**, not a completed crawl. Specifically:

- **{len(CRAWL_FILLED)} of the {len(COLUMNS)} requested columns are empty.** `http_status`, `ssl`,
  `robots_txt`, `sitemap_url`, `cms`, `server`, `hosting_provider`, `pdf_count`,
  `estimated_pages`, `latitude`, `longitude`, `logo_url` and the rest cannot be determined
  without fetching each site. They are deliberately NULL rather than guessed. `enrich_crawler.py`
  (shipped alongside) fills them in one pass and rewrites every deliverable.
- **{int(by_ver.get('unconfirmed', 0))} rows are `verified = unconfirmed`.** Their domains were derived from a documented
  naming convention (e.g. `<province>.gov.kh`, confirmed for 7 of 25 provinces via Wikipedia
  infoboxes). They are leads. Do not ingest them into the vector store until the crawler
  returns 2xx and the homepage content confirms ownership.
- **This is not exhaustive.** A genuinely complete `.gov.kh` census requires zone-level access
  that public search cannot substitute for. See section 6.

## 3. Composition

### By category
{table(by_cat, "Category", "Count")}

### By government level
{table(by_lvl, "Level", "Count")}

### By provenance
{table(by_ver, "Verification", "Count")}

### By crawl priority
{table(by_prio, "Priority", "Count")}

### By TLD
{table(tld, "TLD", "Count")}

## 4. Integrity checks passed

- No duplicate hosts (subdomain + registrable domain): **PASS**
- No duplicate organization names: **PASS**
- Every record has a non-empty `organization_name`, `domain`, `category`, `government_level`: **PASS**
- Parent-child links resolve to a named parent or are explicitly root: **PASS**
- Khmer names present for {int((df['khmer_name'] != '').sum())} of {len(df)} records

## 5. Known ambiguities to resolve during crawl

| Organization | Issue |
|---|---|
| Ministry of Tourism | Official GDT directory links to `cambodiatourismindustry.org`; Wikipedia gives `tourism.gov.kh`. Two different properties. |
| Ministry of Agriculture | GDT directory points at `web.maff.gov.kh`, not the apex `maff.gov.kh`. |
| National Bank of Cambodia | `nbc.org.kh` in the official directory; `nbc.gov.kh` also in circulation. |
| CDC vs SNEC | GDT directory labels `cdc.gov.kh` as the Supreme National Economic Council, and `cambodiainvestment.gov.kh` as CDC. At least one label is wrong. |
| Ministry of National Defence | `mod.gov.kh` (current directory) vs `mond.gov.kh` (legacy sources). |
| Ministry of Labour | `mlvt.gov.kh` vs legacy `mlv.gov.kh`. |
| Ministry of Mines and Energy | `mme.gov.kh` post-split; `mime.gov.kh` is the pre-split Industry+Mines+Energy domain. |
| Ministry of Parliamentary Relations | `mnasri.gov.kh` vs `mnasrl.gov.kh`. |

Each of these is a redirect-resolution task: fetch both, follow 30x, record the canonical,
mark the loser as an alias rather than a separate organization.

## 6. How to actually reach completeness

Public search engines will not give you every `.gov.kh` host - `site:` operators are heavily
sampled and most sub-national and internal systems are not indexed at all. The paths that will:

1. **Ask for the zone.** The `.kh` ccTLD is administered under MPTC. As a DGC business analyst
   you are inside the institution that can request the authoritative `.gov.kh` registration list.
   This single request beats every crawling technique below and should be step one.
2. **Certificate transparency.** Query `crt.sh` for `%.gov.kh` and `%.edu.kh`. Every host that has
   ever been issued a public TLS certificate appears there, including ones no search engine indexes.
   This is the highest-yield public method by a wide margin.
3. **Passive DNS.** SecurityTrails / Shodan / Censys subdomain enumeration on the confirmed apex
   domains surfaces internal and staging hosts.
4. **Link-graph expansion.** Crawl the priority-1 sites and harvest every outbound link whose host
   ends in `.gov.kh`, then re-feed. Two or three iterations reach fixpoint.
5. **Wayback CDX.** `http://web.archive.org/cdx/search/cdx?url=*.gov.kh&collapse=urlkey&fl=original`
   returns historical hosts, which catches decommissioned and renamed properties.
6. **The Ministry of Information rollout.** MoI is standing up official sites for all 25 provincial
   and municipal information departments. Re-run discovery after that lands; it will add ~25 hosts
   in one go.

## 7. RAG-specific guidance

- **Priority 1 sites carry the citizen-facing answers** AskGov actually needs: MoI (civil
  registration, ID), MoJ (divorce, courts), MPWT (licences), MLMUPC (land), MoSVY (social
  protection), NSSF (benefits), GDT (tax). Crawl these to full depth first.
- **`tax.gov.kh` is the best-structured corpus on the list** - it segments its own legal
  instruments into Law / Sub-Decree / Prakas / Circular / Decision / Instruction / Notice.
  Preserve that taxonomy as chunk metadata; it maps directly onto how citizens phrase questions.
- **`akp.gov.kh` (Agence Kampuchea Presse) is your freshness feed.** Article URLs follow
  `/post/detail/<id>`, so incremental ingestion is trivial. This is the most direct answer to your
  "how do we keep the data live" problem statement - poll AKP daily, re-crawl ministries monthly.
- **PDF-heavy hosts** (`nis.gov.kh` census releases, GDT legal instruments, NCDD provincial data
  books) are where your OCR-vs-manual-conversion tradeoff bites. Test whether these PDFs carry a
  text layer before committing to an OCR pipeline; Khmer OCR error rates on scanned government
  documents are high enough to poison retrieval.
- **Record `language` per chunk, not per site.** Most of these sites serve parallel Khmer and
  English content at different paths, and a mixed-language index degrades retrieval for both.
- **Respect `robots.txt` and rate-limit at 1 request / 2s per host.** You are crawling your own
  government's infrastructure; a rude crawler from a DGC IP range is a political problem, not
  just a technical one.

## 8. Reproduction

```
python build_dataset.py        # regenerates all 8 deliverables from seed_registry.py
python enrich_crawler.py       # fetches every host, fills the {len(CRAWL_FILLED)} crawl columns, rewrites outputs
```
"""
with open(f"{OUT}/crawl_statistics.md", "w", encoding="utf-8") as f:
    f.write(stats)

print(f"records: {len(df)}")
print(by_ver.to_string())
print(by_cat.to_string())
