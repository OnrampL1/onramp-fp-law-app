# Phase 6 Legal Corpus Validation Report

Status: Research sprint output. No architecture, schema, or code decisions are made in this document.
Scope: Validates the five-document Lebanese Legal KB MVP corpus only. Corpus is frozen for this sprint — not expanded.
Date of research: 2026-08-12.

Tag legend used throughout: `[VERIFIED FACT]` `[SECONDARY SOURCE]` `[INFERENCE/RECOMMENDATION]` `[UNVERIFIED]` `[REQUIRES LEGAL REVIEW]`

---

## Executive Summary

All five sources are hosted by (or, for the Code of Commerce, cross-listed on) the **Lebanese University Center for Legal Informatics Studies and Research** (مركز المعلوماتية القانونية), reachable at the official university subdomain `legallaw.ul.edu.lb` (mirrored at the bare IP `77.42.251.205`, same server). This center is a real, state-decree-established university unit `[VERIFIED FACT]` (Decree 3144/1986, amended by Decree 4166/1987; absorbed into the Faculty of Law in 1993 by Decree 4141/1993 — this provenance statement is published on the site's own "About" section). It is a **secondary compiler/publisher of legislation**, not the promulgating authority (the Lebanese Republic / Official Gazette is the authority in every case) `[VERIFIED FACT]`.

The single most important finding: **this source tracks amendments at the article level and shows integrated, current article text with an inline citation to the amending law and its effective date.** This was directly confirmed for the Code of Obligations and Contracts (Article 844, amended by Law 126/2019, effective 29/03/2019) and for the Labour Law (Article 29, amended by Laws 267/2014 and 207/2000). This is strong, verified evidence for both currentness and RAG/citation suitability — considerably stronger than "the page is online today."

**Content quality is strong across all five documents. Licensing/reuse rights are undocumented everywhere** — no terms-of-use page, no robots.txt, and no bulk/API access policy could be found on the Lebanese University site; ECGI's page for the Code of Commerce likewise carries only generic site-wide policy links, not per-document reuse terms. Every source in this corpus is therefore `[REQUIRES LEGAL REVIEW]` for production/commercial use, while being strong for development use.

One title/scope mismatch was found: the document the user specified as "Intellectual Property Law / قانون حماية الملكية الفكرية" resolves (at the given `lawId=171843`) to Law No. 75/1999, **"Protection of Literary and Artistic Property"** — i.e., Lebanon's **copyright law**, not a unified IP code. Lebanese trademark and patent protection live in separate, older instruments (Trademark Law/Decree 2385 of 1924; Patent Law No. 240/2000) that are not part of this corpus. See Part 1 and Part 8.

The Code of Commerce link the user provided under "Lebanese University" (`lawId=244226`) is a copy of the Code of Obligations and Contracts link, not the Code of Commerce. The correct page was located independently: `legallaw.ul.edu.lb/Law.aspx?lawId=244586`. See Part 2.

---

## Part 1 — Content Validation

### 1. Code of Obligations and Contracts (قانون الموجبات والعقود)

| Field | Value | Tag |
|---|---|---|
| Arabic title | قانون الموجبات والعقود | `[VERIFIED FACT]` (site) |
| French title | Code des obligations et des contrats (per NATLEX: "Loi du 9 mars 1932 portant Code des obligations et des contrats") | `[VERIFIED FACT]` (NATLEX record) |
| English title | Code of Obligations and Contracts | `[SECONDARY SOURCE]` (conventional translation, used by NATLEX/commentary) |
| Instrument type / number | Law, "Number 0" — i.e., no formal sequential law number, consistent with French Mandate-era legislative practice | `[VERIFIED FACT]` (site field `رقم 0`) |
| Promulgation date | 09/03/1932 | `[VERIFIED FACT]` (site + NATLEX agree) |
| Official Gazette | No. 2642, published 11/04/1932, pages 2–104 | `[VERIFIED FACT]` (site fields) |
| Article count | Up to Article 1107 (repeal/entry-into-force clause) | `[VERIFIED FACT]` (site navigation tree) |
| Complete document available | Yes, full article tree present | `[VERIFIED FACT]` |
| Article-by-article | Yes | `[VERIFIED FACT]` |
| Languages available | Arabic (confirmed present); French exists in the original historical instrument per NATLEX title, but was not confirmed as a parallel full-text on the Lebanese University site in this sprint | Arabic: `[VERIFIED FACT]`; French full text on this specific host: `[UNVERIFIED]` |
| Format | HTML (server-rendered ASP.NET pages, real text, not scanned/image) | `[VERIFIED FACT]` |
| Machine-readable article numbers | Yes — each article rendered as `<span>المادة</span><span>{number}</span>` | `[VERIFIED FACT]` |
| Hierarchy | Section (قسم) → Book (كتاب) → Title (باب) → Chapter (فصل) → Part (جزء) → Article, fully present in navigation tree | `[VERIFIED FACT]` |
| Amendments mentioned | Yes, dedicated "Amended Articles" (المواد المعدلة) index | `[VERIFIED FACT]` |
| Amended text integrated | Yes — sampled Article 844 shows the amended text inline with the amending law and effective date | `[VERIFIED FACT]` |
| Amendment dates identifiable | Yes (e.g. 29/03/2019 for the 126/2019 amendment) | `[VERIFIED FACT]` |
| Amending laws identifiable | Yes — sampled amendments include Law 126/2019, Law 483/1995, Law 159/1992, Legislative Decree 51/1932 | `[VERIFIED FACT]` |
| Claims to be consolidated/current | Not via an explicit banner/statement, but functionally yes (amendments are integrated inline into article text) | `[INFERENCE/RECOMMENDATION]` |
| Latest amendment determinable | For sampled articles, yes, per-article | `[VERIFIED FACT]` (per-article, not document-wide) |
| Historical vs. current version distinguishable | Original 1932 Gazette citation is separate from the "amended by" annotations, so yes at the article level | `[VERIFIED FACT]` |
| Annotations/editorial notes | Minimal — amendment tag + effective date only, no interpretive commentary | `[VERIFIED FACT]` |
| Gazette citations present | Yes, at the document level (No. 2642); not reconfirmed per individual amendment | Document-level: `[VERIFIED FACT]`; per-amendment Gazette refs: `[UNVERIFIED]` |

### 2. Code of Commerce (قانون التجارة البرية)

**Correction to source list**: the "Lebanese University" URL supplied for this document (`lawId=244226`) is a duplicate of Document 1's link and actually resolves to the Code of Obligations and Contracts. The correct Lebanese University page, located independently via search, is `http://legallaw.ul.edu.lb/Law.aspx?lawId=244586`.

| Field | Value | Tag |
|---|---|---|
| Arabic title | قانون التجارة البرية ("Land/Terrestrial Commerce Code" — note: not "قانون التجارة" generically; there is a separate Maritime Commerce Code, قانون التجارة البحرية, at `lawId=168899`, out of scope here) | `[VERIFIED FACT]` |
| English title | Code of Commerce (conventional) | `[SECONDARY SOURCE]` |
| Instrument type / number | Legislative Decree (مرسوم إشتراعي) No. 304 | `[VERIFIED FACT]` |
| Promulgation date | **Discrepancy found**: the Lebanese University law-detail page's structured date field states `24/12/1942`; several independent secondary sources (search-indexed page titles from the same institution, and the ECGI record) instead cite `4/12/1942` / "December 12th, 1942" for the same decree. Not resolved in this sprint. | `[REQUIRES VERIFICATION]` |
| Official Gazette | No. 4075, published 07/04/1943, pages 1–62 | `[VERIFIED FACT]` (site field) |
| Article count | Up to Article 668 | `[VERIFIED FACT]` |
| Complete document / article-by-article | Yes | `[VERIFIED FACT]` |
| Languages | Arabic confirmed on the Lebanese University page; Arabic-only on ECGI (French/English not offered there) | `[VERIFIED FACT]` |
| Format | HTML | `[VERIFIED FACT]` |
| Machine-readable article numbers | Yes, same pattern as Document 1 | `[VERIFIED FACT]` |
| Hierarchy | Book/Title/Chapter present in the navigation tree (same platform as Doc 1) | `[VERIFIED FACT]` |
| Amendments mentioned | Yes — 10 entries in the "Amended Articles" index, including **Law 126/2019** | `[VERIFIED FACT]` |
| Amendments integrated | Consistent with Doc 1's pattern (not individually re-sampled for this document this sprint) | `[INFERENCE/RECOMMENDATION]` based on platform consistency |
| Consolidated/current claim | Same as Doc 1 — functional, not explicit | `[INFERENCE/RECOMMENDATION]` |

### 3. Electronic Transactions and Personal Data Law (Law No. 81/2018)

| Field | Value | Tag |
|---|---|---|
| Arabic title | قانون المعاملات الإلكترونية والبيانات ذات الطابع الشخصي | `[VERIFIED FACT]` |
| English title | Electronic Transactions and Personal Data Law | `[SECONDARY SOURCE]` (widely used, e.g. SMEX's published English Gazette translation) |
| Law number | 81 | `[VERIFIED FACT]` |
| Promulgation date | 10/10/2018 | `[VERIFIED FACT]` (site) |
| Official Gazette | Site states No. 45, published **18/10/2018**, pages 4546–4568. Multiple secondary/commentary sources (Clym, Digital Watch Observatory, and others) instead state publication **31/12/2018** with entry into force **31/03/2019**. **Not resolved — a real discrepancy requiring Gazette-level verification before this date is relied on.** | Site field: `[VERIFIED FACT]` (as stated by that source); commentary date: `[SECONDARY SOURCE]`; which is correct: `[REQUIRES VERIFICATION]` |
| Article count | 136 | `[VERIFIED FACT]` |
| Complete document / article-by-article | Yes | `[VERIFIED FACT]` |
| Languages | Arabic on the Lebanese University site; an independent English translation of the Gazette text is published by SMEX (a Lebanese digital-rights NGO) — useful as a cross-check, not as the corpus source | Arabic: `[VERIFIED FACT]`; SMEX English translation: `[SECONDARY SOURCE]` |
| Format | HTML | `[VERIFIED FACT]` |
| Machine-readable article numbers | Yes | `[VERIFIED FACT]` |
| Amendments | **None recorded** in this site's Amended Articles index for this law | `[VERIFIED FACT]` (absence, as of this snapshot) |
| Subsequent amendments/implementing instruments referenced elsewhere | The law itself reportedly conditions certain provisions (official electronic documents) on a future Council of Ministers decree; whether that decree has since been issued was not confirmed in this sprint | `[UNVERIFIED]` |

### 4. Labour Law (قانون العمل)

| Field | Value | Tag |
|---|---|---|
| Arabic title | قانون العمل | `[VERIFIED FACT]` |
| Instrument type / number | The page itself labels it simply "قانون العمل" without restating a decree number on the article-view page used; independent cross-check (Lebanese Ministry of Justice and Ministry of Labour sites) confirms this is the Labour Code issued 23/09/1946 | `[VERIFIED FACT]` (cross-verified against `labor.gov.lb` and `justice.gov.lb` independently of the Lebanese University site) |
| Promulgation date | 23/09/1946 | `[VERIFIED FACT]` (agrees across Lebanese University page, Ministry of Labour, Ministry of Justice) |
| Official Gazette | No. 40 | `[VERIFIED FACT]` (site) — publish date/page not captured this sprint, `[UNVERIFIED]` |
| Article count | Not reliably extracted this sprint — the article-view page used (`LawView.aspx?opt=view`) renders article numbers in a way this sprint's extraction did not cleanly capture; qualitative sampling confirmed articles at least through the 80s (Article 87 observed) | `[UNVERIFIED]` (exact total) |
| Complete document available | Yes, appears complete (single continuous full-text view rather than the tree-navigated view used for Docs 1/2) | `[VERIFIED FACT]` |
| Note on page template | This URL uses a different template (`LawView.aspx?opt=view`) than the other four (`Law.aspx`) — a single scrollable full-text page rather than a section tree. This is a real structural difference relevant to Part 4 (RAG suitability): it does not have the same navigable hierarchy metadata as the tree-view pages. | `[VERIFIED FACT]` |
| Character encoding note | The HTML `<meta>` tag on this page declares `windows-1252`, but the actual bytes served are UTF-8 (confirmed via `file` inspection and successful Arabic-text extraction). A naive extractor trusting the declared meta-charset could mis-decode this page. | `[VERIFIED FACT]` |
| Amendments mentioned | Yes, inline — e.g. Article 29 tagged "(عدلت بموجب قانون 267/2014)(عدلت بموجب قانون 207/2000)"; Article 55 tagged "(عدلت بموجب قانون 5/1987)" | `[VERIFIED FACT]` |
| Amendments integrated | Yes, same inline pattern as Doc 1 | `[VERIFIED FACT]` |

### 5. "Intellectual Property Law" — resolves to Law No. 75/1999, Protection of Literary and Artistic Property

| Field | Value | Tag |
|---|---|---|
| Arabic title (as hosted at the given lawId) | حماية الملكية الادبية والفنية ("Protection of Literary and Artistic Property") | `[VERIFIED FACT]` |
| **Scope mismatch** | This is Lebanon's **copyright law**, not a general intellectual-property code. Lebanese trademark protection is a separate, much older instrument (Decree 2385/1924 per secondary sources); patent protection is Law No. 240/2000, also separate. No single "قانون حماية الملكية الفكرية" instrument unifying all IP rights was found to exist in Lebanese law. | `[VERIFIED FACT]` (structure) / `[SECONDARY SOURCE]` (the 1924/2000 figures, not independently opened this sprint) |
| Law number | 75 | `[VERIFIED FACT]` |
| Promulgation date | 03/04/1999 | `[VERIFIED FACT]` |
| Official Gazette | No. 18, published 13/04/1999, page 1104 | `[VERIFIED FACT]` |
| Article count | 101 | `[VERIFIED FACT]` |
| Complete / article-by-article | Yes | `[VERIFIED FACT]` |
| Amendments | 2 entries in the Amended Articles index (not individually inspected this sprint) | `[VERIFIED FACT]` (count only) |
| Format / structure | Same platform and pattern as Docs 1–3 | `[VERIFIED FACT]` |

---

## Part 2 — Provenance

**Common provenance chain for all five documents:**

```
Lebanese Republic (promulgating authority)
    ↓
Official Gazette (الجريدة الرسمية) — cited by number/date/page on every record
    ↓
Lebanese University — Center for Legal Informatics Studies and Research
(مركز الدراسات والأبحاث في المعلوماتية القانونية, est. Decree 3144/1986,
 amended Decree 4166/1987, folded into Faculty of Law by Decree 4141/1993)
    ↓
Distributed at legallaw.ul.edu.lb (official Lebanese University subdomain,
 "ul.edu.lb"), mirrored on a bare IP host
```

For the Code of Obligations and Contracts specifically, NATLEX (ILO) is an **independent secondary distributor** one level further removed — it hosts its own PDF copy and its own bibliographic record, but is not the promulgating authority and does not claim to be.

For the Code of Commerce, ECGI is likewise an **independent secondary distributor/compiler** of corporate-governance-relevant codes across many countries, crediting an individual contributor for the Lebanese submission; it explicitly does not claim original legal authority.

Per-source answers:

| Source | Who hosts/publishes | Underlying legal authority | Reproducing or creating law? | Independent corroboration found |
|---|---|---|---|---|
| Code of Obligations and Contracts (Lebanese University) | Lebanese University Legal Informatics Center | Lebanese Republic, 1932 | Reproducing | NATLEX independently republishes the same instrument with matching title/date `[VERIFIED FACT]` |
| Code of Obligations and Contracts (NATLEX) | ILO | Lebanese Republic, 1932 | Reproducing | Matches Lebanese University record |
| Code of Commerce (Lebanese University) | Lebanese University Legal Informatics Center | Lebanese Republic, 1942 | Reproducing | ECGI record independently cites the same decree number and the 126/2019 amendment `[VERIFIED FACT]` |
| Code of Commerce (ECGI) | ECGI (European Corporate Governance Institute) | Lebanese Republic, 1942 | Reproducing (compiled from a named external contributor) | Cross-matches Lebanese University record |
| Law 81/2018 | Lebanese University Legal Informatics Center | Lebanese Republic, 2018 | Reproducing | Article count/title independently corroborated by multiple commentary sites (Clym, Digital Watch, SMEX); Gazette date does **not** cross-match, see Part 1 |
| Labour Law | Lebanese University Legal Informatics Center | Lebanese Republic, 1946 | Reproducing | Independently corroborated by Lebanese Ministry of Labour (`labor.gov.lb`) and Ministry of Justice (`justice.gov.lb`) `[VERIFIED FACT]` |
| Law 75/1999 (copyright) | Lebanese University Legal Informatics Center | Lebanese Republic, 1999 | Reproducing | Not independently cross-hosted elsewhere within this sprint's research; title/number internally consistent `[UNVERIFIED]` beyond single-source |

Primary evidence, in the strict sense (an original Gazette scan), was not located or opened for any of the five documents in this sprint — all five are transcriptions by a secondary compiler. This is normal for legal-tech corpora but means **none of these five copies can currently be verified byte-for-byte against the original Gazette**.

---

## Part 3 — Currentness / Amendments

| Document | Classification | Evidence |
|---|---|---|
| Code of Obligations and Contracts | **B — Consolidated/amended text** | Article 844 shown with amendment tag "(عدلت بموجب 126/2019)" and effective date 29/03/2019, text integrated inline `[VERIFIED FACT]` |
| Code of Commerce | **B — Consolidated/amended text** | Amended-articles index lists Law 126/2019 among 10 amendments `[VERIFIED FACT]`. Individual amended-article text was not re-sampled this sprint, so full integration is `[INFERENCE/RECOMMENDATION]` by platform consistency, not independently reconfirmed article-by-article. |
| Law 81/2018 | **C — Unknown** (leaning A, original text) | No amendments recorded on the host; whether the law itself, as originally enacted, is what's shown, or whether later amendments simply aren't reflected on this platform, was not independently resolved | 
| Labour Law | **B — Consolidated/amended text** | Article 29 and Article 55 both show inline amendment tags with amending law numbers and (for one) integration going back decades (1987, 2000, 2014) `[VERIFIED FACT]` |
| Law 75/1999 | **B — Consolidated/amended text** (tentative) | 2 amendment entries exist in the index; not opened/sampled this sprint, so the *degree* of integration is `[UNVERIFIED]` |

**On Law No. 126 of 29 March 2019 specifically** (the user's flagged check): **Verified — it is represented** in both the Code of Obligations and Contracts (Article 844) and the Code of Commerce amendment index on this host. This directly answers the instruction not to assume incorporation without checking: incorporation is confirmed for these two documents, on this specific host, as of this sprint's snapshot.

**On Law 81/2018 subsequent amendments/implementing instruments**: not resolved. The host shows zero recorded amendments; independent secondary commentary suggests at least one clause is contingent on a future Council of Ministers decree, and there is an unresolved discrepancy about the Gazette publication date itself (see Part 1). **Can Clausio safely call this copy "current law"?** Not without resolving the Gazette-date discrepancy first — the underlying text is very likely accurate (no competing text was found anywhere), but the document's own metadata is internally inconsistent with commentary sources on when it took effect.

**Can each be safely described as "the current law," today?**

- Code of Obligations and Contracts: Yes, with the caveat that only the sampled article (844) was individually verified as amendment-integrated; a full sweep of all ~40 amendment entries was not performed this sprint.
- Code of Commerce: Provisionally yes (index confirms the 2019 amendment is tracked), but individual amended article text integration was not re-sampled this sprint — recommend one spot-check before relying on it.
- Law 81/2018: **No** — not until the Gazette-date discrepancy is resolved and it's confirmed no post-2019 amendment exists that this host simply doesn't track.
- Labour Law: Yes for the sampled articles; this law has been amended very heavily over 80 years, so "current" should be understood as "current per this host's amendment tracking," not independently verified against every one of dozens of amending laws.
- Law 75/1999: Provisionally yes; not independently sampled at the article level this sprint.

---

## Part 4 — Structural / RAG Suitability

| Field extractable? | Docs 1, 2, 3, 5 (`Law.aspx` tree template) | Doc 4, Labour Law (`LawView.aspx` full-text template) |
|---|---|---|
| Article number | Yes, machine-readable (`<span>المادة</span><span>{n}</span>`) | Yes, but embedded inline in a heading tag with amendment annotations mixed in — needs more careful parsing |
| Article title | Not generally present as a separate field (articles are numbered, not individually titled) | Same |
| Article text | Yes | Yes |
| Book / Title / Chapter / Section | Yes — full tree, each level a distinct link with an explicit article-range in its own label, e.g. "الباب الاول... (2 - 8)" | **No equivalent tree on this template** — it is a single flat scrollable document; hierarchy would have to be reconstructed from heading text patterns, not a structured tree |
| Language | Arabic confirmed on all five; French/English full text not confirmed on this host for any of them | Same |
| Source | Yes — Lebanese University page URL + Gazette citation | Same |
| Law number | Yes | Confirmed via cross-source, not from this page's own visible fields |
| Date | Yes | Yes |
| Gazette reference | Yes, document-level (number/date/page) | Document-level Gazette number found (40); page/date not captured this sprint |
| Amendment/version metadata | Yes — dedicated "Amended Articles" endpoint, per-article amending-law + effective date | Yes, inline per-article, same underlying data, different presentation |

**Cross-language / hybrid retrieval suitability**: all five sources are Arabic-only on this host as far as this sprint confirmed. Cross-language retrieval (Arabic query → French/English source, or vice versa) is **not supported by content currently in hand** for any of the five; it would require sourcing separate French/English translations (e.g., NATLEX's French title suggests a French original may exist for Doc 1 specifically, not yet located as full text).

**Citation verification suitability**: strong. Article-level chunking is natural given the machine-readable numbering; the amendment-tag pattern gives a second, independent citation surface (law + effective date) beyond the base Gazette citation — this is unusually good for a legal RAG citation-verification design, better than typical scraped legal text.

**Structural risk flagged**: the Labour Law's different page template (flat view vs. tree view) means a single generic scraper/parser built against the other four will not directly work on it — this is a real, concrete integration cost to note for whoever eventually designs ingestion (no design proposed here, per the architecture boundary).

---

## Part 5 — Usage / Licensing

| Question | Lebanese University (`legallaw.ul.edu.lb`) | NATLEX (ILO) | ECGI |
|---|---|---|---|
| Viewing/access | Publicly accessible, no login | Publicly accessible | Publicly accessible |
| Downloading | Page-by-page HTML only observed; no bulk download link found | Direct PDF download link exists (though it returned HTTP 403 to this sprint's automated fetch — see note below) | PDF download offered for the Lebanese Code of Commerce |
| Storing locally | No statement found | No explicit statement found this sprint | No statement found |
| Extracting/transforming text | No statement found | No statement found | No statement found |
| Embeddings / derived data | No statement found | No statement found | No statement found |
| Commercial use | No statement found | ILO copyright is asserted site-wide (1996–2024 per search-indexed pages), but the specific reuse/commercial terms were not located this sprint | Generic Terms of Use link exists but was not opened for content this sprint |
| Redistribution / API / bulk access | No robots.txt found (server returns a generic error rather than a robots.txt file); no dedicated terms-of-use page found at common paths (`/terms.aspx`, `/TermsOfUse.aspx`, both 500) | Not determined this sprint | Not determined this sprint |

**Note on the NATLEX PDF 403**: the direct PDF URL the user supplied returned "403 Forbidden" to this sprint's automated fetch tool — this reads as bot/user-agent filtering on ILO's server, not necessarily a legal restriction; a normal browser session would very likely succeed. This is a technical access note, not a licensing finding.

**Bottom line for every one of the five sources, per the user's explicit instruction not to infer permission from public accessibility: `[REQUIRES LEGAL REVIEW]`.** No source in this corpus publishes terms that either grant or forbid the specific downstream uses Clausio needs (storage, embeddings, commercial display, redistribution of excerpts). Public accessibility was confirmed; permission was not.

---

## Part 6 — Source Comparison Matrix

| Source | Content | Completeness | Provenance | Currentness | Structure | RAG suitability | Licensing |
|---|---|---|---|---|---|---|---|
| Code of Obligations and Contracts | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 |
| Code of Commerce | 🟢 | 🟢 | 🟢 | 🟡 (index confirms 126/2019, article-level integration not re-sampled) | 🟢 | 🟢 | 🔴 |
| Law 81/2018 | 🟢 | 🟢 | 🟡 (Gazette date discrepancy) | 🟡 (date discrepancy blocks a confident "current" claim) | 🟢 | 🟢 | 🔴 |
| Labour Law | 🟢 | 🟡 (exact article count not confirmed this sprint) | 🟢 (independently cross-verified via two Lebanese ministries) | 🟢 | 🟡 (different, flatter page template) | 🟡 (needs separate parser logic) | 🔴 |
| Law 75/1999 (mislabeled "IP Law") | 🟢 | 🟢 | 🟡 (single-source only this sprint) | 🟡 (amendments exist, not individually sampled) | 🟢 | 🟢 | 🔴 |

---

## Part 7 — Development Corpus vs. Production Corpus

| Document | Development status | Production status |
|---|---|---|
| Code of Obligations and Contracts | 🟢 Ready | 🟡 Pending — licensing only |
| Code of Commerce | 🟢 Ready | 🟡 Pending — licensing, plus one date discrepancy (4/12 vs 24/12/1942) to close out |
| Law 81/2018 | 🟢 Ready | 🔴 Not yet — licensing **and** the Gazette-date/currentness discrepancy both need resolution first |
| Labour Law | 🟢 Ready, with a note that ingestion tooling needs to handle its different page template | 🟡 Pending — licensing only |
| Law 75/1999 | 🟢 Ready, with the title corrected internally to "Copyright Law" rather than "IP Law" | 🟡 Pending — licensing, plus confirming what the two recorded amendments actually are |

All five are usable today to test extraction, chunking, embeddings, retrieval, and citation verification end-to-end. None should be treated as commercially production-ready yet — licensing is the common blocker across all five, exactly as the sprint's framing anticipated.

---

## Part 8 — Gaps, By Document

**Code of Obligations and Contracts**
- Licensing terms unknown.
- Full-document amendment sweep not performed (only Article 844 individually verified).
- French/English full text not located on this host (only Arabic confirmed here; French title exists per NATLEX metadata).

**Code of Commerce**
- Promulgation date discrepancy: 4/12/1942 (search-indexed page titles, ECGI) vs. 24/12/1942 (Lebanese University structured field) — unresolved.
- Article-level integration of the 126/2019 amendment not individually re-sampled (only confirmed present in the index).
- Licensing terms unknown.

**Law 81/2018**
- Gazette publication date discrepancy: 18/10/2018 (Lebanese University field) vs. 31/12/2018 (multiple secondary commentary sources), with a further claim of 31/03/2019 entry into force — unresolved, and this is the discrepancy most likely to actually matter, since it affects whether "current" can be claimed at all.
- Whether any post-2018 amendment or the Council-of-Ministers implementing decree (for official electronic documents) has been issued — not checked.
- Licensing terms unknown.

**Labour Law**
- Exact total article count not confirmed this sprint (extraction limitation, not a source-quality issue).
- Different page template than the other four — needs its own extraction logic; not itself a content defect.
- Gazette publication date/page not captured this sprint (only Gazette number 40 was captured).
- Given ~80 years of amendments, only two sample articles were checked — a fuller sweep is warranted before calling any specific article "current" with confidence.
- Licensing terms unknown.

**Law 75/1999 ("IP Law")**
- **Title/scope mismatch**: this is copyright law only, not a unified IP code — needs to be renamed/reclassified in any Phase 6 planning that references it, and Clausio should decide separately whether Trademark (Decree 2385/1924) and/or Patent (Law 240/2000) law belong in a future corpus expansion (out of scope for this sprint).
- The two recorded amendments were not opened/characterized this sprint.
- Licensing terms unknown.

---

## Part 9 — Final Corpus Recommendation

**Per-document classification:**

| Document | Development corpus | Production corpus |
|---|---|---|
| Code of Obligations and Contracts | A — Ready | B — Pending verification (licensing) |
| Code of Commerce | A — Ready | B — Pending verification (licensing + date discrepancy) |
| Law 81/2018 | A — Ready | C — Not suitable yet (currentness discrepancy unresolved, on top of licensing) |
| Labour Law | B — Ready with caveats (template/extraction difference) | B — Pending verification (licensing) |
| Law 75/1999 (Copyright) | A — Ready, once relabeled correctly | B — Pending verification (licensing) |

**Answers to the sprint's closing questions:**

1. **Are these five enough for a meaningful Phase 6 MVP?** For *development* purposes, yes — they span contract law, commercial/corporate law, a modern digital-economy law, employment law, and copyright, which is a reasonable spread for testing chunking/retrieval/citation across old French-Mandate-era prose and modern statutory drafting alike. For *production*, no single document in the set is currently clear to ship — licensing is the universal blocker.

2. **Which should be P0?** The user's original P0 grouping (Code of Obligations and Contracts, Code of Commerce, Law 81/2018) holds up on content-quality grounds. Note that Law 81/2018 is the weakest of the three on currentness confidence specifically, so if forced to pick which P0 document needs attention first, it's this one.

3. **Which should be P1?** Labour Law and Law 75/1999 remain reasonable P1s, with the caveat that Law 75/1999's label should be corrected to "Copyright Law" going forward so future planning isn't misled into thinking Lebanese trademark/patent law is already covered.

4. **Which should we ingest first for development?** The Code of Obligations and Contracts is the strongest single candidate to build/test ingestion against first: cleanest verified provenance, cross-corroborated by an independent international source (NATLEX), and the amendment-integration behavior was directly, concretely verified (not just inferred).

5. **Which documents require additional source verification?** Law 81/2018 (Gazette date), Code of Commerce (promulgation date), Labour Law (exact article count, Gazette page), Law 75/1999 (contents of its two amendments).

6. **What must be obtained from Al-Mustashar/Sader before production ingestion?** Not evaluated this sprint — Al-Mustashar and Sader (Lebanon's well-known commercial legal-publishing houses) were not part of the five sources investigated and were outside this sprint's scope per the corpus freeze. If Clausio intends to use either as a corroborating or primary commercial source later, that would need its own separate validation pass, including their specific commercial licensing terms (which, unlike the free sources here, are likely to actually have an explicit published license/subscription agreement — worth checking precisely because it's more likely to give a clear yes/no on licensing than any of today's five sources did).

7. **What questions remain for legal/licensing review?** For all five sources: (a) does public availability on a `.ul.edu.lb` university subdomain imply any usage right beyond viewing, under Lebanese law or general practice for government-authored legal texts; (b) is legislative text itself (as opposed to a particular transcription/compilation of it) copyrightable in Lebanon, and if not, does that change the analysis for reproducing the *compiler's* specific transcription/formatting; (c) does NATLEX's or ECGI's site-wide Terms of Use, if read in full, say anything specific about reuse of individual legal texts; (d) for Law 81/2018 specifically, which Gazette date is correct, and does that affect any current-law representation Clausio would make to users.

---

## Sources Consulted

- https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/57070/LBN57070%20ARA_FR.pdf (PDF fetch blocked — HTTP 403 to automated tooling)
- https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=57070&p_classification=01 → https://webapps.ilo.org/dyn/natlex/natlex4.detail/?p_lang=en&p_isn=57070&p_classification=01 (blocked to automated tooling; record metadata obtained via web search instead)
- https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=fr&p_isn=57070&p_classification=01 (search-indexed title/metadata)
- http://legallaw.ul.edu.lb/Law.aspx?lawId=244226 (Code of Obligations and Contracts)
- http://legallaw.ul.edu.lb/AmendedArticles.aspx?lawId=244226
- http://legallaw.ul.edu.lb/LawArticles.aspx?LawArticleID=972278&LawID=244226 (sampled amended article, Art. 844)
- http://legallaw.ul.edu.lb/Law.aspx?lawId=244586 (Code of Commerce — correct page, located independently)
- http://legallaw.ul.edu.lb/AmendedArticles.aspx?lawId=244586
- http://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=294005&LawID=280636 (Law 126/2019, the omnibus amendment)
- https://www.ecgi.global/publications/codes/lebanese-code-of-commerce
- http://legallaw.ul.edu.lb/Law.aspx?lawId=278573&language=ar (Law 81/2018)
- http://legallaw.ul.edu.lb/AmendedArticles.aspx?lawId=278573
- http://legallaw.ul.edu.lb/LawView.aspx?opt=view&LawID=190374 (Labour Law)
- http://legallaw.ul.edu.lb/Law.aspx?lawId=171843 (Law 75/1999, Copyright)
- http://legallaw.ul.edu.lb/AmendedArticles.aspx?lawId=171843
- https://www.labor.gov.lb (Lebanese Ministry of Labour — cross-check for Labour Law date)
- http://ahdath.justice.gov.lb/law-nearby-work.htm (Lebanese Ministry of Justice — cross-check for Labour Law date)
- https://www.clym.io/regulations/law-no-81-on-electronic-transactions-and-personal-data-lebanon (secondary commentary, Law 81/2018 dates)
- https://dig.watch/resource/electronic-transactions-and-personal-data-law-law-no-81-of-lebanon (secondary commentary)
- https://smex.org/wp-content/uploads/2018/10/E-transaction-law-Lebanon-Official-Gazette-English.pdf (secondary English translation)
- http://legallaw.ul.edu.lb/robots.txt, /terms.aspx, /TermsOfUse.aspx (all checked, none found — negative evidence for Part 5)

Not opened this sprint (for-the-record only, referenced by search results): `tagepedia.org`, `mohamah.net`, `economy.gov.lb` IP-rights pages, `investinlebanon.gov.lb` — these surfaced during search as candidate secondary/cross-check sources for a future sprint but were not verified.
