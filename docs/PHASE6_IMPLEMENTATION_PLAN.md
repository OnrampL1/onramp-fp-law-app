# Phase 6 Implementation Plan — Lebanese Legal Knowledge Base (LLKB)

Status: **Planning document. Nothing in this document has been implemented.**
No schema, migration, code, or config change accompanies this document.
It exists to be reviewed and frozen before Phase 6 engineering begins, per
`CLAUDE.md`'s Guide Mode and Domain Review Workflow.

Inputs to this plan: `docs/AI_ROADMAP.md` (Sections 4, 6, 8), `docs/AI_ARCHITECTURE.md`
(Sections 3.2, 6, 8, 14, 18), `docs/AI_IMPLEMENTATION_GUIDE.md` (Phase 5/6
sections), `docs/DOMAIN_REVIEW_BACKLOG.md`, `docs/PRODUCT_VISION.md`,
`docs/PHASE6_LEGAL_CORPUS_VALIDATION.md`, and direct inspection of
`packages/shared/ai/`, `packages/workers/`, `packages/api/`, and
`packages/shared/prisma/schema.prisma` as they exist today.

---

## 0. Discrepancies Found During Inspection

Per the instruction not to assume documentation matches code, these were
checked directly and are flagged rather than silently resolved:

1. **`AI_ROADMAP.md`'s Phase Status table (Section 1) and
   `AI_IMPLEMENTATION_GUIDE.md`'s Current State table are both stale.**
   Both still show Phase 3 and Phase 4 as "🚧 In progress" and Phase 5 as
   "⏳ Future — not started." Direct inspection of the code
   (`packages/shared/ai/retrieval/`, `OrganizationBrainChunk`,
   `answerOrganizationBrainQuestion`, the `/organization-brain/ask` route,
   full test coverage in `retrieval/*.test.ts`) confirms Phases 3, 4, and 5
   are actually complete, matching this session's own request framing. This
   is a documentation freshness gap, not an architectural conflict — it
   should be corrected as a small, separate doc update (updating two status
   tables) before or alongside Phase 6 kickoff, so `AI_ROADMAP.md` remains
   trustworthy as the single source of truth it claims to be. **Not done as
   part of this plan** — flagged for a one-line-per-table correction,
   separate from Phase 6 design work.
2. **No `jurisdiction` or `governingLaw` field exists anywhere in
   `schema.prisma`**, confirming `DOMAIN_REVIEW_BACKLOG.md`'s open item is
   still genuinely open. This plan does not resolve that item (it concerns
   `Contract`/`OrganizationSettings`, not the Legal KB corpus itself — see
   Section 4.3 below for why Phase 6 does not need to wait for it).
3. **No platform-staff/internal-admin authenticated route layer exists in
   `packages/api/src`** despite `PlatformUser` / `PlatformUserRole`
   (`SUPER_ADMIN`, `SUPPORT_ENGINEER`) already being modeled in
   `schema.prisma`. Every existing route file (`contract.routes.ts`,
   `organization-brain.routes.ts`) authenticates and authorizes against
   `User`/`UserRole` (organization members), not `PlatformUser`. This matters
   directly for Phase 6 because Legal KB ingestion is not a tenant action —
   see Section 6.
4. **`chunkContractText` (in `packages/shared/ai/retrieval/chunking.ts`) is
   already reused, unmodified, by Organization Brain ingestion**
   (`organization-brain-embeddings.job.ts` imports it directly). Its
   heading-detection regexes
   (`KEYWORD_HEADING_PATTERN`, `NUMBERED_HEADING_PATTERN`) require Latin
   script (`[A-Z][A-Za-z]`) and English keywords (`article|section`). This
   is a real, concrete finding, not a hypothetical: **run against Arabic
   text, neither regex will ever match**, so every legal source document
   would silently fall through to the character-window fallback
   (`splitWithOverlap`), losing article-boundary alignment entirely — chunks
   would split articles at arbitrary character offsets instead of at article
   boundaries. This is the single most important technical finding of this
   inspection pass and directly shapes the ingestion design in Section 6.
5. **`search.ts` hardcodes `websearch_to_tsquery('english', ...)` and
   `ts_rank(content_tsv, ...)` against an `'english'` text-search
   configuration** in both `searchContractChunks` and
   `searchOrganizationBrainChunks`. PostgreSQL's built-in text-search
   configurations do not include Arabic (the shipped set is danish, dutch,
   english, finnish, french, german, hungarian, italian, norwegian,
   portuguese, romanian, russian, simple, spanish, swedish, turkish — no
   Arabic dictionary/stemmer). Reusing `'english'` against Arabic content
   would silently mis-tokenize/mis-stem it. This is a real, load-bearing gap
   the shared retrieval engine's full-text leg does not yet handle — see
   Section 8.
6. **`AICallLog.organizationId` is nullable** (`String? @map("organization_id")`).
   This is existing infrastructure, not a gap — it means the observability
   layer already supports logging a call that isn't tied to one
   organization's data, which is relevant but not identical to what Phase 6
   needs (see Section 4.3: Phase 6 calls **do** have an asking organization,
   just not a scoping one).

None of the above blocks planning. All are accounted for in the design below.

---

## 1. Phase 6 Objective

Build retrieval-augmented question-answering over a small, curated set of
authoritative Lebanese legal texts, reusing the exact retrieval engine
already proven twice (Clause Investigator, Phase 3; Organization Brain
Retrieval, Phase 5), producing answers whose citations identify not just
_that_ a source was quoted but _which law, which article, which version, and
which underlying publisher_ it came from — and doing so without confusing a
secondary compiler's reproduction with the Lebanese Republic's actual
legislative act.

Explicitly, per `AI_ROADMAP.md` Section 6: this phase does not assert legal
correctness of anything it produces. It builds the pipe; legal review of
what flows through it is a separate, tracked dependency
(`AI_ROADMAP.md` Section 8.2) that this plan does not attempt to substitute
for.

---

## 2. Current Research Baseline (from `PHASE6_LEGAL_CORPUS_VALIDATION.md`)

Five documents, all secondary-compiler copies via the Lebanese University
Center for Legal Informatics Studies and Research (`legallaw.ul.edu.lb`,
mirrored at a bare IP), all `[REQUIRES LEGAL REVIEW]` for licensing, all
approved for **development use only**:

| Document                                                | Instrument                       | Articles      | Structural notes                                                                                                  |
| ------------------------------------------------------- | -------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Code of Obligations and Contracts                       | Law, no number ("0"), 09/03/1932 | ~1,107        | Tree-view template; amendment integration directly verified (Art. 844, Law 126/2019)                              |
| Code of Commerce                                        | Legislative Decree 304           | 668           | Tree-view template; Law 126/2019 confirmed in amendment index; unresolved date discrepancy (4/12 vs 24/12/1942)   |
| Law 81/2018 (Electronic Transactions and Personal Data) | Law 81                           | 136           | Tree-view template; unresolved Gazette-date discrepancy —**should not yet be represented as confidently current** |
| Labour Law                                              | Law, 23/09/1946                  | Not confirmed | **Different page template** (flat full-text view, not tree-navigated)                                             |
| Law 75/1999                                             | Law 75                           | 101           | Tree-view template; internally "Copyright Law," not a unified IP code                                             |

All five are Arabic-only on this host. All five showed real, machine-readable
article numbering and (for 4 of 5, individually sampled for 2) inline
amendment metadata (amending law + effective date) integrated into the
article text itself.

This plan treats that report as ground truth for source characteristics and
does not re-derive it.

---

## 3. Existing Architecture To Reuse (verified by direct code reading)

| Mechanism                           | Location                                                                                              | Reused as-is for Phase 6?                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Embedding generation                | `providers/index.ts` → `generateEmbeddings()`                                                         | Yes, unchanged                                                                                  |
| Chat completion + validation        | `schemas/index.ts` → `getValidatedCompletion()`                                                       | Yes, unchanged                                                                                  |
| Prompt/schema registry              | `registry/index.ts`                                                                                   | Yes, unchanged mechanism — new entries only                                                     |
| RRF fusion                          | `retrieval/search.ts` → `fuseRankings()`                                                              | Yes, unchanged — pure function, corpus-agnostic                                                 |
| Hybrid search orchestration         | `retrieval/search.ts` → `hybridSearch()`                                                              | Yes, unchanged — takes a`CandidateFetcher`, corpus supplies its own SQL                         |
| Chunk replace algorithm             | `retrieval/store.ts` → `replaceChunks()`                                                              | Yes, unchanged — takes`ChunkPersistenceOps`, corpus supplies its own Prisma calls               |
| Citation excerpt verification       | `retrieval/citations.ts` → `verifyCitations()`                                                        | Yes, unchanged — takes generic`RetrievedChunk[]`, already corpus-agnostic                       |
| Retrieve→generate→verify→retry loop | `retrieval/investigator.ts` → `answerQuestion()`                                                      | Yes, unchanged — takes`AnswerQuestionOps`, corpus supplies `retrieve()`/`countIndexed()`        |
| Context optimizer seam              | `context.ts` → `optimizeContext()`                                                                    | Yes, unchanged (still a no-op everywhere)                                                       |
| Token-budget paragraph packing      | `retrieval/chunking.ts` → `packSectionIntoChunks()` / `splitWithOverlap()`                            | **Partially** — the packing math is reusable; the _heading-detection_ half is not (Section 0.4) |
| BullMQ retryable/terminal job shape | `extraction.job.ts` pattern, mirrored by `embeddings.job.ts` / `organization-brain-embeddings.job.ts` | Yes, same shape for a new legal-ingestion job                                                   |
| Shared object storage client        | `packages/shared/storage/`                                                                            | Yes — for archiving raw scraped snapshots (Section 6)                                           |

Nothing above needs its mechanism changed. Everything new is either a new
thin wrapper following an existing parameterization pattern (`ops`/`fetcher`
objects), or genuinely new content (prompts, schemas, a scraper).

---

## 4. Domain Model Proposal

### 4.1 Metadata categorization (as requested — A/B/C/D)

**A. Required runtime retrieval metadata** (needed for the query itself to
behave correctly and stay safe):

- The absence of any `organizationId` column on the new tables — global
  scope is enforced structurally (nothing to filter, nothing to forget to
  filter), the same "structural, not incidental" standard already applied
  to org-scoping elsewhere.
- `embedding` (`vector(1536)`) and `contentTsv` (`tsvector`) — same as both
  existing chunk tables.
- `legalStatus` (in force / repealed / unknown) — needed so a repealed
  source, once one exists in the corpus, can be excluded from retrieval by
  construction, not by hoping nobody asks about it.
- `licenseStatus` (development-only / cleared-for-production / under-review)
  — needed so a production deployment can structurally exclude
  not-yet-cleared sources from being retrieved at all (Section 9).
- `jurisdiction` — present as a column even though every current row is
  Lebanon, because retrieval needs a stable filter dimension that doesn't
  require a schema change the day a second jurisdiction is added.

**B. Required legal provenance/citation metadata** (needed so a citation is
correct and trustworthy, even where it isn't used as a query filter):

- Document identity: title, `sourceType`, `instrumentNumber`,
  `authorityTier` (using `AI_ROADMAP.md` Section 6's own frozen vocabulary,
  not a competing one).
- `promulgatingAuthority` vs `compilerSource` — two distinct fields, always
  both populated, never conflated (Section 7).
- `officialGazetteNumber` / `officialGazettePublishDate` / `officialGazettePage`.
- `sourceUrl` — the actual page ingested.
- Per-article: `articleNumber` (typed, indexable — not just embedded in a
  free-text heading string), `amendingInstrument`, `amendmentEffectiveDate`
  (nullable — populated only where the source itself states them, exactly
  mirroring what was directly observed on Article 844 and Labour Law Article
  29 in the validation research).
- `lastVerifiedAt` — when Clausio's snapshot was captured/confirmed against
  the source; surfaced in citations so a reader knows how fresh the
  grounding is (an explainability requirement, not decoration).

**C. Research/source-inventory metadata** (useful to whoever manages the
corpus; not needed by the retrieval/citation runtime path):

- Notes on structural quirks (e.g. "Labour Law uses a different page
  template"), the specific open discrepancies (date conflicts), which
  secondary sources cross-corroborate a document (NATLEX, ECGI). **Recommend
  this stays in `PHASE6_LEGAL_CORPUS_VALIDATION.md` and in ingestion-adapter
  code comments, not in Prisma.** Modeling it in the schema would be
  research bookkeeping masquerading as a domain concept — exactly the kind
  of speculative field `CLAUDE.md`'s Domain Review Workflow exists to
  prevent ("Never add fields because the UI has them").

**D. Future / explicitly deferred:**

- `repealDate` and `supersedes`/`supersededBy` relationships between
  `LegalSource` rows — reserve the enum value and the relation shape
  conceptually, do not build until a real repealed/superseding pair exists
  in the corpus.
- Multi-language content as **linked sibling records**, per `AI_ROADMAP.md`
  Section 6's explicit frozen direction ("Arabic, French, and English source
  versions preserved as distinct linked records, not merged"). Not built now
  — every current source is Arabic-only; a `language` scalar column is
  sufficient until a second language edition actually needs linking.
- Full historical (pre-amendment) article text — see Section 5, Option 2.
- Jurisdiction-aware `Contract` ↔ `LegalSource` linking — Phase 7 Assistant
  territory, depends on the still-open `DOMAIN_REVIEW_BACKLOG.md` jurisdiction
  item.
- Arabic-aware full-text search dictionary/extension (Section 0.5, Section 8).
- Direct article-number / law-number exact-match retrieval leg (Section 8) —
  cheap once `articleNumber`/`instrumentNumber` exist as typed columns, but
  not required for a working MVP.

### 4.2 Why not a polymorphic universal chunk table

Rejected. `ContractChunk` and `OrganizationBrainChunk` are both already
non-polymorphic, each with a real foreign key to its parent and a real
foreign key to `Organization`. A polymorphic table would need either a
nullable-per-parent-type FK design (breaking the real, enforced foreign keys
`CLAUDE.md`'s Database Rules require) or an application-level
`parentType`/`parentId` pair with joins resolved in code (breaking Prisma's
type safety and `onDelete: Cascade` guarantees the existing two tables both
rely on). This choice was implicitly available for Phase 5 and wasn't taken;
Phase 6 has no new reason to take it now. **Recommendation: extend the
existing two-level pattern (parent → chunk), not replace it.**

### 4.3 Global vs organization-scoped — and a clarification the plan needs to state explicitly

The Legal KB corpus itself (`LegalSource`, `LegalChunk`) has **no**
`organizationId` column anywhere — this is the "structural, not incidental"
requirement from `AI_ROADMAP.md` Section 4.

This is a different thing from **who is asking**. Every question still comes
from an authenticated user who belongs to an organization.
`AICallLog.organizationId` (already nullable, already existing) should still
be populated with the _asking_ organization's id, for cost attribution and
observability — exactly as `answerOrganizationBrainQuestion` and
`answerContractQuestion` already do via `getValidatedCompletion`'s
`organizationId` parameter. **Global content, organization-attributed usage**
— not "no organization involved at all." Getting this distinction wrong in
either direction (accidentally filtering the corpus by org, or failing to
log which org asked) would be a real, opposite-direction bug; both are
concretely testable (Section 10).

This also means Phase 6 does **not** need `DOMAIN_REVIEW_BACKLOG.md`'s open
`Contract.governingLaw`/jurisdiction item resolved to ship. That item is
about which jurisdiction governs a _contract_ — a routing/matching question
that only matters once more than one jurisdiction exists in the Legal KB, or
once Phase 7's Assistant needs to auto-select a jurisdiction from contract
context. With a Lebanon-only corpus, there is nothing to route between yet.
**This plan recommends treating that Domain Review item as still correctly
open and still not blocking Phase 6**, and surfaces this explicitly rather
than silently assuming it either way.

---

## 5. Legal Document / Version Model — Options

The research baseline (Section 2) establishes a hard constraint that shapes
this decision: **the source material gives Clausio the current,
amendment-integrated text of each article, plus metadata about which law
amended it and when — but not the pre-amendment historical wording.** Any
versioning design has to be honest about what's actually sourceable today.

### Option 1 — Current-only, effective-dated metadata (Recommended)

One row per article (`LegalChunk`, possibly several rows if an article is
long enough to need multiple chunks), holding only the current,
consolidated text, with `amendingInstrument`/`amendmentEffectiveDate` as
descriptive metadata, not a version-selection filter. Re-ingestion
**replaces** a source's chunks the same way `replaceContractChunks` and
`replaceOrganizationBrainItemChunks` already do (delete-then-insert,
idempotent, no upsert-fighting). There is no "obsolete version" to
accidentally retrieve because only current text is ever stored — old text is
gone the moment re-ingestion runs, structurally, not filtered at query time.

- **Pros:** Matches the corpus's actual sourceable content exactly. Matches
  the existing precedent (both current chunk tables are already
  destructively replaced on re-ingestion, not versioned). Simplest to build
  and reason about. Directly extensible to Option 2 later (additive, not a
  redesign) if historical text sourcing ever becomes available.
- **Cons:** Cannot answer "what did the law say on date X" (a real, if
  distant, future need — e.g., a contract signed years ago under
  since-amended law). Requires a companion process (not automated by this
  phase) to periodically re-scrape and re-verify, or the corpus silently
  goes stale after the next real-world amendment.
- **Mitigation for the con:** `lastVerifiedAt` (Section 4.1, Category B) is
  surfaced in every citation, so at minimum a reader can see how fresh the
  answer's grounding is, rather than the system implying false certainty.

### Option 2 — Full historical versioning (immutable, effective-dated rows)

Every amendment produces a new, immutable `LegalArticleVersion` row with
`effectiveFrom`/`effectiveTo`, retrieval always filtering to the row whose
range covers "now" (or a caller-supplied point in time). Mirrors the
immutability principle already used for `AIAnalysis`.

- **Pros:** Correct long-term direction; supports point-in-time legal
  questions; consistent with the platform's general immutability philosophy.
- **Cons:** **Cannot actually be built from what the corpus currently
  provides.** The Lebanese University site's own amendment index states
  _that_ an article changed, _which_ law changed it, and _when_ — it does
  not preserve the superseded wording itself. Building Option 2 now would
  mean fabricating or leaving null the one field (pre-amendment text) that
  defines the whole feature, which is worse than not building it. Doing this
  properly would require a second sourcing effort (archived Gazette scans of
  prior text) that is out of scope for Phase 6 engineering.

### Recommendation

**Option 1 for Phase 6, explicitly designed so Option 2 is a future,
additive extension** (a new `LegalArticleVersion` table referencing
`LegalChunk`/`LegalSource`, added only once historical-text sourcing exists)
— not a redesign. This is presented as a recommendation, not a silent
decision — **Domain Review item #3** (Section 14) asks for explicit
sign-off on this specific tradeoff, since it means Clausio will state "this
is what's currently in force" but cannot yet state "this is what applied on
[past date]."

---

## 6. Legal Chunk Model — Recommended Design

**Two new tables**, matching the proven two-level shape (parent → chunk)
used by both existing corpora, extended only where the research baseline
concretely justifies it:

### `LegalSource` (parent — one row per instrument, e.g. "Code of Obligations and Contracts")

No `organizationId`. Fields, by category from Section 4.1:

- Identity/content (B): `title`, `sourceType` (enum:
  `LEGISLATION` | `CODE` | `DECREE` | `JURISPRUDENCE` | `DOCTRINE` |
  `ADMINISTRATIVE_GUIDANCE` — `AI_ROADMAP.md` Section 6's own vocabulary,
  reused verbatim rather than inventing a parallel one), `authorityTier`
  (enum, same source), `instrumentNumber` (string — not int; "0" and
  non-numeric identifiers exist in the real data), `language` (string,
  default `"ar"` — not a linked-record group yet, per Section 4.1 Category D)
- Provenance (B): `promulgatingAuthority` (string, e.g. "Lebanese Republic"
  — a field, not a hardcoded constant, so it's visible/auditable and
  doesn't assume Lebanon forever), `compilerSource` (string, e.g. "Lebanese
  University Legal Informatics Center"), `sourceUrl`, `rawSnapshotStorageKey`
  (nullable — points at an archived copy of the raw scraped HTML/text in
  `packages/shared/storage/`, so Clausio can prove what it ingested even if
  the source site later changes or disappears; reuses existing storage
  infrastructure, not a new integration)
- Official citation (B): `officialGazetteNumber`, `officialGazettePublishDate`,
  `officialGazettePage`, `promulgationDate`
- Runtime filtering (A): `jurisdiction` (string, default `"LB"`),
  `legalStatus` (enum: `IN_FORCE` | `REPEALED` | `UNKNOWN`, default
  `IN_FORCE`), `licenseStatus` (enum: `DEVELOPMENT_ONLY` |
  `UNDER_REVIEW` | `CLEARED_FOR_PRODUCTION`, default `DEVELOPMENT_ONLY`)
- Freshness (B): `lastVerifiedAt`
- Standard: `id`, `deletedAt` (soft delete — an open call, see Section 14),
  `createdAt`, `updatedAt`

### `LegalChunk` (retrieval unit — mirrors `ContractChunk`/`OrganizationBrainChunk`'s base shape exactly, plus two justified additions)

No `organizationId`. Base shape identical to the existing two chunk tables:
`id`, `legalSourceId` (FK, `onDelete: Cascade`), `chunkIndex`, `headingPath`
(the article label as a display string, e.g. `"Article 844"` — reusing the
exact column both existing tables already have, not a new one), `content`,
`tokenCount`, `embedding` (`vector(1536)`), `contentTsv` (`tsvector`).

Two additions, each justified by a specific requirement, not by symmetry:

- `articleNumber` (string, nullable, **indexed**) — a _typed_ column
  distinct from `headingPath`'s free-text label, specifically because
  Section 11's "exact article number search" requirement needs an exact,
  efficient lookup (`WHERE article_number = $1`), not a fuzzy string match
  against a display label. Nullable because some chunks (preamble, the
  repeal/entry-into-force clause) aren't tied to one article number.
- `amendingInstrument` / `amendmentEffectiveDate` (nullable) — populated
  only where the source states them, living at the chunk/article level
  because that's literally where the source data lives (the amendment tag
  is attached to a specific article, not the whole document).

Denormalized from `LegalSource` onto `LegalChunk`, for the same reason
`organizationId` is denormalized onto `ContractChunk` today ("so retrieval
queries can be [scoped] at the query itself... without a join" — the
existing schema's own comment): `legalStatus` and `licenseStatus`. This lets
the retrieval query's `WHERE` clause filter directly on the chunk table, the
same shape as every existing hybrid-search query, rather than requiring a
join for every retrieval call.

### Why this isn't "Option B" (polymorphic) or an unrecognizable "Option C"

It's Option A, refined with the minimum additions the actual research
findings justify — not a third architecture. The three genuinely new pieces
(`articleNumber`, `amendingInstrument`/`amendmentEffectiveDate`, and
`LegalSource`'s provenance/licensing fields) each trace to a specific,
concrete requirement from Sections 8, 9, 11, and 13 of the original brief,
not to speculative completeness.

---

## 7. Authority / Source Hierarchy Model

Mechanism: `LegalSource.promulgatingAuthority` and `LegalSource.compilerSource`
are **always both populated, and always kept distinct**. For the current
five documents: `promulgatingAuthority = "Lebanese Republic"`,
`compilerSource = "Lebanese University Legal Informatics Center"`
(`legallaw.ul.edu.lb`). `authorityTier` is set to `LEGISLATION` /
`BINDING_LEGISLATION`-equivalent for all five (all are enacted law, not
jurisprudence/doctrine/administrative guidance — those tiers exist in the
enum for future use, per Category D).

This alone is a schema-level guarantee, not a complete one — the actual
risk named in the brief ("Lebanese University says X" being represented as
"the Lebanese Republic enacted X") is a **prompt-design** risk as much as a
schema one. The new Legal KB answer prompt (Section 8, new
`prompts/legal-kb-ask/v1.md`) must explicitly instruct the model to
attribute claims to the legal instrument (law/article), and treat
`compilerSource` only as "the copy Clausio used," never as the thing being
cited for legal authority. This is named here as a requirement on the prompt
content, to be written and reviewed like any other prompt — not solved by
the schema alone.

Cross-verification sources (NATLEX independently corroborating the Code of
Obligations and Contracts; ECGI independently corroborating the Code of
Commerce, including Law 126/2019) are **not** modeled in the schema — this
is Category C research metadata (Section 4.1), already recorded in
`PHASE6_LEGAL_CORPUS_VALIDATION.md`, and doesn't need to be queryable at
runtime.

---

## 8. Ingestion Pipeline — Corrected Design

The brief's proposed pipeline shape is directionally right but needs one
correction the research surfaced: **legal-source ingestion is not "download
a file and run the existing extraction/chunking job."** That pattern
(`extractText()` → `chunkContractText()`) exists for opaque files a customer
uploads (PDF/DOCX with unknown internal structure). The Lebanese University
site instead gives Clausio **already-structured HTML** with real article
boundaries — using heading-detection heuristics on flattened text would be
throwing away ground truth the source already provides for free, and (per
Section 0.4) the existing heading regexes wouldn't even fire on Arabic text
if it tried.

Corrected pipeline:

```
Source (legallaw.ul.edu.lb page — one of two known templates:
tree-view for 4 of 5 current docs, flat-view for Labour Law)
   │
   ▼
Source-specific scraper/parser (one per page template, not one generic
HTML→chunks function) — walks the real DOM structure, emits a normalized
intermediate shape per document:
  { legalSourceMetadata, articles: [{ articleNumber, headingPath, text,
    amendingInstrument?, amendmentEffectiveDate? }] }
   │
   ▼
Token-budget packing — REUSES packSectionIntoChunks()/splitWithOverlap()
from chunking.ts directly (these are pure token-budget-packing functions
that take already-known section boundaries as input; only the
heading-*detection* half of chunking.ts is bypassed, not the whole module)
   │
   ▼
generateEmbeddings() — unchanged, direct reuse
   │
   ▼
replaceLegalSourceChunks() — new thin wrapper in store.ts, following the
exact ChunkPersistenceOps pattern already used twice; algorithm itself
(replaceChunks) is unchanged
   │
   ▼
PostgreSQL + pgvector (LegalSource + LegalChunk)
   │
   ▼
Shared retrieval (Section 9)
```

Raw scraped HTML/text is also archived via `packages/shared/storage/`
(existing client, reused, not a new integration), referenced from
`LegalSource.rawSnapshotStorageKey` — so Clausio retains its own record of
what was ingested, independent of the source site's future availability or
changes.

### Who triggers ingestion, and how

This is not a customer-facing upload flow — no tenant uploads legal texts.
Given Section 0.3's finding (no platform-staff route/auth layer exists in
`packages/api` today), building one just for this would be scope creep
disguised as a Phase 6 requirement. **Recommendation: ingestion runs as an
operator-invoked script** (`packages/shared/scripts/ingest-legal-source.ts`,
same precedent as the existing `scripts/run-eval.ts`), not a new HTTP
endpoint, avoiding the need to build new platform-admin authorization
infrastructure for a five-document MVP. Whether the script itself calls the
BullMQ job directly in-process or enqueues it for the existing worker
infrastructure (for retry/observability consistency with every other
AI-adjacent job) is **Domain Review item #7** (Section 14) — both are
reasonable; the plan does not decide silently.

---

## 9. Retrieval Design

New wrapper in `search.ts`, third alongside `searchContractChunks` /
`searchOrganizationBrainChunks`: `searchLegalKbChunks()`. Same
`hybridSearch()`/`CandidateFetcher` mechanism, unchanged. Its SQL differs
only in:

- No `organizationId` filter (structural global scope).
- `WHERE legal_status = 'IN_FORCE' AND license_status = ANY(<allowed-for-this-deployment>)`
  — the concrete mechanism satisfying Section 12 (development/production
  boundary). **Approved rule (2026-08-12), stated explicitly here so it
  isn't only implicit in the enum's existence:**
  - **Development mode:** `license_status IN ('DEVELOPMENT_ONLY', 'UNDER_REVIEW')`
  - **Production mode:** `license_status IN ('CLEARED_FOR_PRODUCTION')` only
  - No current Phase 6 source may be marked `CLEARED_FOR_PRODUCTION` — so in
    practice, a production deployment retrieves nothing from the Legal KB
    until a source is explicitly cleared. This is intentional, not a bug to
    fix in Phase 6.
  - Nothing else changes when a source is later cleared — its row's
    `licenseStatus` is simply updated, no redesign.
- **Full-text leg cannot reuse `'english'` unchanged (Section 0.5).**
  Recommendation for MVP: use PostgreSQL's `'simple'` text-search
  configuration for the Arabic content (honest — no fake stemming, but
  correct tokenization and exact/substring-style term matching, which
  matters specifically for defined legal terms and article references).
  Real Arabic-aware stemming (a dedicated dictionary/extension) is named
  explicitly as Category D future work, not silently assumed to already
  work. **Domain Review item #8** confirms this is understood and accepted
  for MVP.

Two retrieval enhancements are enabled by `articleNumber` existing as a
typed column. Originally scoped as **not MVP-blocking** — a fast-follow once
the base pipeline is proven:

- **Implemented in Batch 4** (pulled forward from fast-follow — a scope
  addition beyond Batch 4's original acceptance criteria, flagged as such in
  its PR): direct exact-match article lookup (`WHERE article_number = $1`),
  merged as a guaranteed-inclusion candidate ahead of the RRF-fused results
  rather than fused into their scoring. Real-query evidence forced this
  forward: "what does Article N say" questions returned
  semantically-related-but-wrong articles from vector search alone (e.g.
  Article 654 asked, Articles 96/249/118 returned) — an exact-match problem
  vector similarity was never going to solve. Detection reuses the same
  "المادة N" pattern shape already proven in
  `legal-source-flatview-parser.ts`, extended to sub-numbered ("12-1") and
  bis-style ("12-مكرر") labels, since Labour Law's real ingested data already
  has both.
  - **Cross-source ambiguity bug found and fixed same-day (2026-08-14),
    during Batch 4 acceptance verification, not before ship.**
    `article_number` is only unique *within* one source, not across all
    five — live-DB proof: `article_number = '654'` matches a row in **both**
    the Code of Obligations and Contracts (an employment/service-hire
    termination clause) and the Code of Commerce (a bankruptcy-rehabilitation
    clause) — two unrelated articles. The initial, unscoped implementation
    surfaced **both** at the same guaranteed-inclusion (`score: Infinity`)
    priority regardless of which instrument the question actually named —
    false confidence on a wrong-source match. Fixed by: (1) a small,
    deliberately non-exhaustive Arabic instrument-alias table
    (`INSTRUMENT_ALIASES` in `search.ts`) that scopes the lookup to one
    source via a `legal_source_id IN (SELECT id FROM legal_sources WHERE
    title ILIKE ...)` subquery when the question names an instrument (e.g.
    "قانون الموجبات والعقود", "قانون التجارة", "قانون العمل"); (2) when no
    instrument is named and the unscoped lookup still returns rows from more
    than one distinct source, the guaranteed-inclusion boost is withheld
    entirely and the query falls back to hybrid search alone — no error, no
    unverified guess presented as certain. **Live re-verification, same
    Article 654 case, post-fix:** instrument named ("...من قانون الموجبات
    والعقود") → exactly 1 boosted result, correctly from the Code of
    Obligations and Contracts source; no instrument named (ambiguous) → 0
    boosted results, 8 ordinary hybrid results returned, no error; no
    instrument named + a confirmed-unique article number (654 in a
    different, single-source instance — article 1000) → unchanged, still 1
    boosted result — regression-clean.
- Still a fast-follow, not yet implemented: direct exact-match law-number
  lookup against `LegalSource.instrumentNumber`.

`authorityTier` / `jurisdiction` filtering are present as structural query
parameters, defaulted to "no-op" (all tiers, `jurisdiction = 'LB'`) — same
"structural, not incidental" treatment already given to org-scoping, not
meaningfully exercised until the corpus diversifies.

---

## 10. Citation Design

**`verifyCitations()` is reused completely unchanged.** It already operates
on the generic `RetrievedChunk[]` shape (`id`, `sourceId`, `headingPath`,
`content`, `score`) and does pure excerpt-substring verification — nothing
about it is contract-specific today, and nothing about Legal KB requires
changing that mechanism. This directly satisfies "do not duplicate citation
verification."

What legitimately needs extension is **citation presentation**, not
verification — exactly the same distinction `enrichSources()` already draws
for the existing two corpora (it enriches `sourceId`/`headingPath` from the
already-retrieved chunk list, not from a fresh DB call). A new
`enrichLegalSources()` follows the identical pattern, with one addition: a
single batched lookup (by the already-verified chunk ids) joining
`LegalChunk` → `LegalSource` to attach the richer legal fields —
`instrumentTitle`, `articleNumber`, `officialGazetteReference`,
`amendingInstrument`/`amendmentEffectiveDate` (when present),
`promulgatingAuthority`, `compilerSource`, `sourceUrl`, `lastVerifiedAt`.

**New, additive check specific to Legal KB (not a modification of
`verifyCitations`):** an "article existence" check — every article number
the model's answer _mentions in prose_ (not just what it structurally cited)
should be checkable against real `articleNumber` values for the cited
`LegalSource`. This is a mechanical DB-existence check, not a duplicate of
excerpt verification, and it's what makes "test hallucinated legal articles"
(Section 12) actually testable rather than aspirational. Recommended as a
new, small function in the Legal KB investigator wrapper, layered on top of
(not replacing) the existing verification step.

---

## 11. Evaluation Strategy

Reuses the existing framework (`GoldenExample`, `runGoldenSet`,
`packages/shared/ai/evaluation/`) mechanism-unchanged. The `jurisdiction`
field on `GoldenExample` already exists and is currently populated with a
placeholder value (`"general"`) on every existing case — Legal KB cases
would finally give it real signal (`"LB"`), which the framework already
supports without modification.

Two existing adversarial fixtures (`019-prompt-injection.ts`,
`020-false-legal-authority.ts`) were read directly, not assumed from their
names: both are **Phase 2 Risk-analysis** cases (a contract clause falsely
asserting Lebanese-law validity; a contract embedding a prompt-injection
attempt against the risk classifier). They are not directly reusable for
Legal KB, but they establish that the evaluation framework already knows how
to model this _style_ of adversarial case — Phase 6 needs its own, freshly
written, analogous fixtures (e.g., a question that tries to get the
Assistant to assert something not actually in the corpus; a question
embedding an injection attempt against the citation/grounding rule).

Mapped to the brief's specific sub-questions:

| Question                                                         | Answerable by engineering alone?                                                                                                  | How                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citation grounding                                               | Yes                                                                                                                               | Reuses`verifyCitations()` directly — zero legal judgment                                                                                                                                                                                                                                  |
| Hallucinated legal articles                                      | Yes                                                                                                                               | New mechanical existence-check (Section 10) — DB lookup, not legal judgment                                                                                                                                                                                                               |
| "I don't know / insufficient source" behavior                    | Yes                                                                                                                               | Adversarial golden-set cases: a question with no matching content in the 5-doc corpus; assert the model declines rather than fabricates — same pattern as existing adversarial fixtures                                                                                                   |
| Temporal/version metadata is*present* when it should be          | Yes                                                                                                                               | Mechanical: does the returned source include`amendingInstrument`/`amendmentEffectiveDate` when the underlying chunk has them                                                                                                                                                              |
| Temporal/version*legal correctness* (is this really current law) | **No**                                                                                                                            | Two of five sources have open Gazette-date discrepancies (validation report Part 3) that only a legal reviewer or a primary-Gazette check can resolve — this is exactly`AI_ROADMAP.md` Section 5 Category C territory, not engineering-verifiable                                         |
| Jurisdiction boundaries                                          | Structurally, not meaningfully yet                                                                                                | The corpus is 100% Lebanon; a real cross-jurisdiction leak test needs a second jurisdiction to exist first — Category D                                                                                                                                                                   |
| Public legal benchmarks                                          | **None known**                                                                                                                    | Unlike Analysis/Investigator (which benefit from CUAD), no public, licensable Lebanese-law QA benchmark is known to this planning pass. Recorded as an open question (Section 15) rather than inventing one. Category B (Public Benchmarks) likely stays empty for Legal KB specifically. |
| What needs a qualified legal reviewer                            | Legal correctness of the underlying text itself; legal correctness of generated*answers*; any future risk/enforceability judgment | Exactly`AI_ROADMAP.md` Section 5/8.2's already-named, already-tracked dependency — extended here with Legal-KB-specific examples, not a new category                                                                                                                                      |

---

## 12. Development vs Production Strategy

Enforced structurally, not by convention: `LegalSource.licenseStatus`
(default `DEVELOPMENT_ONLY`) is denormalized onto `LegalChunk` and is a hard
`WHERE` clause in `searchLegalKbChunks()`, gated by deployment
configuration (e.g., an env flag analogous to `AI_PROVIDER_MODE`, naming
TBD — **Domain Review item #10**). A source moving from development to
production licensing clearance is a single-row status update, not a schema
or retrieval-code change — this is the concrete mechanism satisfying the
brief's requirement to "replace or upgrade development sources with
licensed sources without redesigning the entire Legal KB."

**Approved retrieval rule (2026-08-12) — the definitive statement, referenced
from Section 9 as well:**

| Deployment mode | `licenseStatus` values included in retrieval |
|---|---|
| Development | `DEVELOPMENT_ONLY`, `UNDER_REVIEW` |
| Production | `CLEARED_FOR_PRODUCTION` only |

None of the five current Phase 6 sources may be marked
`CLEARED_FOR_PRODUCTION` (per the Domain Review's additional scope
constraints, `docs/DOMAIN_REVIEW_BACKLOG.md`). A production deployment
therefore retrieves nothing from the Legal KB until a source is explicitly
and separately cleared — an intentional consequence of this rule, not a
defect to work around during Phase 6.

---

## 13. Domain Review Decisions Requiring Approval

**Status: Approved 2026-08-12.** All 11 items below were reviewed against
the actual repository and frozen without conflict, with one wording
correction made to `AI_ROADMAP.md` Section 6 (versioning) as part of item
11's housekeeping. Full outcome recorded in `docs/DOMAIN_REVIEW_BACKLOG.md`
under "Lebanese Legal Knowledge Base — Phase 6 Domain Review." The
recommendations below are now the frozen decisions, with these
refinements approved alongside them: soft-delete cascade is FK-level only
(fires on hard delete, not on `deletedAt`); items 7 and 9 (ingestion
trigger, ingestion job execution) were approved together as one pipeline
(operator script → existing BullMQ worker conventions); single-source
proof (Code of Obligations and Contracts only) is required before the
remaining four sources are ingested; none of the five sources may be
marked `CLEARED_FOR_PRODUCTION` in Phase 6.

Per `CLAUDE.md`'s Domain Review Workflow, none of the following should be
implemented before explicit sign-off:

1. **New Prisma models**: `LegalSource`, `LegalChunk`, and the enums
   `LegalSourceType`, `LegalAuthorityTier`, `LegalStatus`, `LegalLicenseStatus`
   (Sections 4, 6, 7).
2. **Global (non-organization-scoped) table** — a genuinely new pattern in
   this schema; every other content table in `schema.prisma` today has an
   organization relationship. Confirm this is understood and intended, not
   just inferred from the roadmap document.
3. **Versioning approach: Option 1 (current-only) vs Option 2 (full
   historical)** (Section 5) — recommend Option 1; needs explicit
   confirmation given the tradeoff (no point-in-time legal answers yet).
4. **Whether `deletedAt` soft-delete applies to `LegalSource`** — recommend
   yes (accidental removal of an entire law is high-blast-radius), but this
   wasn't dictated by existing precedent either way and should be confirmed.
5. **`articleNumber` as a nullable typed string** — confirm this is the
   right type (vs. a structured `{book, chapter, article}` composite) given
   only article-level citation was requested; deeper hierarchy
   (Book/Title/Chapter/Section, all confirmed present in the source per the
   validation report) is Category D unless explicitly wanted now.
6. **`sourceType`/`authorityTier` enum value sets** — using
   `AI_ROADMAP.md` Section 6's four-tier list and its `sourceType` list
   verbatim; confirm no additional values are needed before the enum ships
   (Prisma enum changes are additive-safe, but worth deciding deliberately
   once rather than drifting).
7. **Ingestion trigger mechanism: operator script vs. new platform-admin
   HTTP endpoint** (Section 8) — recommend script-only for MVP, explicitly
   to avoid building new platform-auth infrastructure as an unplanned side
   effect of Phase 6.
8. **Full-text search configuration for Arabic content: `'simple'` for MVP**
   (Section 9) — confirm this honest-but-imperfect default is acceptable,
   versus investing in a real Arabic text-search extension before MVP ships.
9. **New BullMQ queue name and job data shape** for legal ingestion (e.g.
   `QUEUE_NAMES.LEGAL_KB_EMBEDDINGS`), if the operator script enqueues rather
   than calls in-process (ties to item 7).
10. **Env-level license-status gating mechanism name/shape** for the
    development/production boundary (Section 12).
11. **Whether `AI_ROADMAP.md`'s and `AI_IMPLEMENTATION_GUIDE.md`'s stale
    phase-status tables (Section 0.1) get corrected now or separately** —
    not a Phase 6 design question, but a real housekeeping item this
    inspection surfaced.

---

## 14. Batch Breakdown

Each batch is independently reviewable and independently testable, following
the same discipline every prior AI phase used in this repository.

### Batch 1 — Domain/schema foundation

- **Depends on:** Domain Review items 1–6, 11 resolved (all approved
  2026-08-12 — see `docs/DOMAIN_REVIEW_BACKLOG.md`).
- **Files:** `packages/shared/prisma/schema.prisma`, a new migration under
  `packages/shared/prisma/migrations/`.
- **Non-goals for this batch specifically:** no scraper, no ingestion
  script, no embeddings, no retrieval query changes, no prompts, no API
  routes, no config/env-flag code for license gating (that's Batch 4's
  responsibility to *consume* the columns Batch 1 creates — Batch 1 only
  creates them). Do not implement anything from Batches 2–6 while doing
  this batch.

This section is self-contained: an implementer should not need anything
beyond this document, `ContractChunk`/`OrganizationBrainChunk` (as the
pattern to mirror), and the existing migrations for those two tables (as
the pattern to mirror for hand-written vector/tsvector DDL).

#### `LegalSource` — exact fields

No `organizationId` field, anywhere, under any name.

| Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `String @id @default(uuid()) @db.Uuid` | No | generated | |
| `title` | `String` | No | — | |
| `sourceType` | `LegalSourceType` | No | — | |
| `authorityTier` | `LegalAuthorityTier` | No | — | |
| `instrumentNumber` | `String` | No | — | Not `Int` — real values include `"0"` and non-numeric identifiers |
| `language` | `String` | No | `"ar"` | Scalar, not a linked-record group (Section 4.1 Category D) |
| `jurisdiction` | `String` | No | `"LB"` | |
| `promulgatingAuthority` | `String` | No | — | e.g. `"Lebanese Republic"` — never populated with a compiler's name |
| `compilerSource` | `String` | No | — | e.g. `"Lebanese University Legal Informatics Center"` |
| `sourceUrl` | `String` | No | — | The actual page ingested |
| `rawSnapshotStorageKey` | `String?` | Yes | `null` | Set by Batch 2; nullable in Batch 1 because nothing populates it yet |
| `officialGazetteNumber` | `String?` | Yes | `null` | |
| `officialGazettePublishDate` | `DateTime? @db.Date` | Yes | `null` | |
| `officialGazettePage` | `String?` | Yes | `null` | |
| `promulgationDate` | `DateTime? @db.Date` | Yes | `null` | |
| `legalStatus` | `LegalStatus` | No | `IN_FORCE` | |
| `licenseStatus` | `LegalLicenseStatus` | No | `DEVELOPMENT_ONLY` | See Section 12 for the retrieval rule this drives |
| `lastVerifiedAt` | `DateTime?` | Yes | `null` | |
| `deletedAt` | `DateTime?` | Yes | `null` | Soft delete, mirrors `Contract`/`OrganizationBrainItem` |
| `createdAt` | `DateTime @default(now())` | No | now() | |
| `updatedAt` | `DateTime @updatedAt` | No | auto | |

Relation: `chunks LegalChunk[]`

Suggested `@map` naming (snake_case, matching every existing model's
convention exactly): `source_type`, `authority_tier`, `instrument_number`,
`promulgating_authority`, `compiler_source`, `source_url`,
`raw_snapshot_storage_key`, `official_gazette_number`,
`official_gazette_publish_date`, `official_gazette_page`,
`promulgation_date`, `legal_status`, `license_status`, `last_verified_at`,
`deleted_at`, `created_at`, `updated_at`. Table: `@@map("legal_sources")`.

Indexes: `@@index([sourceType])`, `@@index([legalStatus])`,
`@@index([licenseStatus])`.

#### `LegalChunk` — exact fields

No `organizationId` field, anywhere, under any name. Base shape
intentionally identical to `ContractChunk`/`OrganizationBrainChunk` except
where noted.

| Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `String @id @default(uuid()) @db.Uuid` | No | generated | |
| `legalSourceId` | `String @db.Uuid` | No | — | FK → `LegalSource.id` |
| `chunkIndex` | `Int` | No | — | Same as both existing chunk tables |
| `headingPath` | `String?` | Yes | `null` | Article display label, e.g. `"Article 844"` — same column both existing tables already have |
| `articleNumber` | `String?` | Yes | `null` | **New, typed, indexed.** Nullable — preamble/repeal-clause chunks aren't tied to one article |
| `content` | `String @db.Text` | No | — | |
| `tokenCount` | `Int?` | Yes | `null` | |
| `amendingInstrument` | `String?` | Yes | `null` | **New.** Populated only where the source states it |
| `amendmentEffectiveDate` | `DateTime? @db.Date` | Yes | `null` | **New.** Same condition as above |
| `legalStatus` | `LegalStatus` | No | — (no default; always copied from parent at write time) | Denormalized from `LegalSource`, same reasoning as `organizationId` on `ContractChunk` |
| `licenseStatus` | `LegalLicenseStatus` | No | — (no default; always copied from parent at write time) | Denormalized from `LegalSource` |
| `embedding` | `Unsupported("vector(1536)")?` | Yes | `null` | Same as both existing chunk tables |
| `contentTsv` | `Unsupported("tsvector")?` | Yes | `null` | Same as both existing chunk tables, **but generated with `'simple'` config, not `'english'`** — see Migration Requirements below |
| `createdAt` | `DateTime @default(now())` | No | now() | |

Relation: `legalSource LegalSource @relation(fields: [legalSourceId], references: [id], onDelete: Cascade)`

Suggested `@map` naming: `legal_source_id`, `chunk_index`, `heading_path`,
`article_number`, `token_count`, `amending_instrument`,
`amendment_effective_date`, `legal_status`, `license_status`,
`content_tsv`, `created_at`. Table: `@@map("legal_chunks")`.

Constraints: `@@unique([legalSourceId, chunkIndex])` — same idempotent
replace-not-upsert pattern as `ContractChunk`/`OrganizationBrainChunk`.

Indexes: `@@index([legalSourceId])`, `@@index([articleNumber])`,
`@@index([licenseStatus])`.

#### Enums — exact member order (frozen; must match verbatim everywhere in the codebase and docs)

```
enum LegalSourceType {
  LEGISLATION
  CODE
  DECREE
  JURISPRUDENCE
  DOCTRINE
  ADMINISTRATIVE_GUIDANCE
}

enum LegalAuthorityTier {
  BINDING_LEGISLATION
  JURISPRUDENCE
  DOCTRINE
  ADMINISTRATIVE_GUIDANCE
}

enum LegalStatus {
  IN_FORCE
  REPEALED
  UNKNOWN
}

enum LegalLicenseStatus {
  DEVELOPMENT_ONLY
  UNDER_REVIEW
  CLEARED_FOR_PRODUCTION
}
```

`LegalSourceType` and `LegalAuthorityTier` use `AI_ROADMAP.md` Section 6's
own vocabulary verbatim (six `sourceType` values, four authority tiers) —
do not add, remove, reorder, or rename members without a new Domain Review.

#### Relationships and cascade behavior

- `LegalChunk.legalSourceId → LegalSource.id`, `onDelete: Cascade` at the
  database level. This fires **only on a genuine hard delete** of a
  `LegalSource` row (rare, operator-only, not part of normal application
  flow).
- `LegalSource.deletedAt` (soft delete) does **not** cascade anything at
  the database level — it is an application-level flag. Excluding a
  soft-deleted source's chunks from retrieval is a **Batch 4** requirement
  (the retrieval query must filter on it, via the denormalized columns or a
  join), not something Batch 1's schema alone enforces. Batch 1 only needs
  the column to exist correctly.

#### Migration requirements

Purely additive — two new tables, four new enums, zero existing tables
touched. Prisma can express everything above except:

- `embedding vector(1536)` — added by hand in the migration SQL, exactly
  mirroring the `contract_chunks`/`organization_brain_chunks` migrations'
  vector column + index DDL.
- `content_tsv tsvector` as a `GENERATED ALWAYS AS (...) STORED` column —
  Prisma has no syntax for generated columns, so this is hand-written too,
  **with one deliberate, required difference from the existing two
  migrations: use `to_tsvector('simple', content)`, not
  `to_tsvector('english', content)`** — per the approved Arabic full-text
  decision (Domain Review item 8). Copying the `english` config from the
  existing precedent without changing it would be a real, silent bug, not
  a harmless copy-paste.
- The vector index (mirror the existing HNSW/`vector_cosine_ops`-style
  index already used on `contract_chunks.embedding` /
  `organization_brain_chunks.embedding`) and a GIN index on `content_tsv`,
  same pattern as those two tables.

**Known recurring hazard on this project:** running `prisma migrate dev
--create-only` has repeatedly proposed dropping hand-written
indexes/generated columns on unrelated tables and recreating pre-existing
partial indexes elsewhere as duplicates. Inspect the generated
`migration.sql` before applying it and strip anything that isn't genuinely
new DDL for `legal_sources`/`legal_chunks`.

#### Batch 1 acceptance criteria

- `npx prisma validate` passes.
- Migration applies cleanly to a fresh database and rolls back cleanly.
- `npx prisma generate` succeeds; the generated types for `LegalSource` and
  `LegalChunk` contain no `organizationId` field anywhere.
- Direct SQL verification (not just trusting the Prisma schema
  annotations):
  - `SELECT column_name FROM information_schema.columns WHERE table_name = 'legal_sources'` includes every field above with the expected nullability.
  - Same for `legal_chunks`.
  - `SELECT indexname FROM pg_indexes WHERE tablename = 'legal_chunks'` includes the unique constraint on `(legal_source_id, chunk_index)`, an index on `article_number`, an index on `license_status`, the vector index, and the GIN index on `content_tsv`.
  - `SELECT pg_get_viewdef(...)` or equivalent confirms `content_tsv`'s generation expression uses `'simple'`, not `'english'`.
- A test hard-delete of a `LegalSource` row cascades to delete its
  `LegalChunk` rows — verified directly against the database.
- `git diff` on the migration file shows only new-table DDL — no changes to
  `contract_chunks`, `organization_brain_chunks`, `contracts`,
  `contract_notes`, or any other existing table's indexes.
- No enum anywhere in the migration contains a value outside the four lists
  above.

#### Tests

Migration apply/rollback (as above) plus a Prisma Client smoke test
confirming the client compiles and both models are queryable with an empty
result set immediately after migration (no seed data required for Batch 1).

#### Risks

Low — purely additive, no existing table touched. The one real risk is the
`'simple'`-vs-`'english'` generated-column detail above being missed by
copy-pasting the existing migration pattern without adjusting it.

### Batch 2 — Legal source scraping/ingestion (structure extraction)

- **Scope:** Source-specific scraper/parser(s) for the two known page
  templates; normalized intermediate representation; raw-snapshot archiving
  via `packages/shared/storage/`.
- **Files:** New module, e.g. `packages/shared/ai/legal-kb/ingest/` (naming
  TBD at implementation time) or `packages/workers/src/lib/legal-source-scraper.ts`
  — exact location decided at implementation time, not this planning pass.
- **Depends on:** Batch 1; Domain Review item 7.
- **Acceptance criteria:** Running the scraper against a real fetched copy of
  each of the 5 sources produces correct article counts matching the
  validation report (1,107 / 668 / 136 / [TBD] / 101) and correctly
  identifies the amendment metadata already directly verified (Article 844,
  Labour Law Article 29).
- **Tests:** Fixture-based unit tests against saved sample HTML (not live
  network calls in CI); at least one real, manual end-to-end run against the
  live source, per this project's established "verify with real data"
  discipline.
- **Risks:** Two page templates means two parsers; a third source added
  later could need a third. HTML structure could change without notice
  (mitigated by the raw-snapshot archive).

### Batch 3 — Legal chunking + embeddings

- **Scope:** Token-budget packing reusing `packSectionIntoChunks`/
  `splitWithOverlap`; `replaceLegalSourceChunks()` in `store.ts`; BullMQ job
  (or in-process call, per item 7/9) wiring `generateEmbeddings()`.
- **Files:** `packages/shared/ai/retrieval/store.ts` (new wrapper, existing
  algorithm unchanged), new job file mirroring
  `organization-brain-embeddings.job.ts`'s shape, `queue/types.ts` +
  `queue/client.ts` + `workers/src/queues/index.ts` if queued.
- **Depends on:** Batch 2.
- **Acceptance criteria:** All 5 sources chunked and embedded; chunk counts
  reasonable given article counts and the 500–800 token budget; ceiling
  check (mirroring `getMaxChunksPerContract`) present before any embedding
  spend.
- **Tests:** Real embeddings generated and stored for at least one full
  source; `vector_dims(embedding) = 1536` verified directly against the
  database, same verification discipline used for the OpenRouter embeddings
  fix earlier this project.
- **Risks:** Embedding cost for ~2,000+ articles across 5 sources — worth a
  rough cost estimate before running for real, though one-time (or
  infrequent, on re-ingestion) rather than recurring per-request cost.

### Batch 4 — Legal retrieval integration

- **Scope:** `searchLegalKbChunks()` in `search.ts`; `'simple'`-config
  full-text leg; `licenseStatus`/`legalStatus` filtering; `LEGAL_KB_LICENSE_MODE`
  env flag + checked-in production-clearances registry
  (`legal-kb-production-clearances.ts`) as the two-gate guard on top of
  `licenseStatus`. **Scope addition beyond original acceptance criteria**
  (flagged explicitly, not folded in silently): direct exact-match
  article-number lookup (`WHERE article_number = $1`), pulled forward from
  Section 9's fast-follow list after real-query evidence showed vector
  search alone can't answer "what does Article N say" — see Section 9 for
  the resolved discussion.
- **Files:** `packages/shared/ai/retrieval/search.ts`,
  `packages/shared/ai/retrieval/legal-kb-production-clearances.ts`,
  `packages/shared/ai/config/index.ts`.
- **Depends on:** Batch 3; Domain Review items 8, 10.
- **Acceptance criteria:** A real query against real indexed content returns
  relevant chunks; global scope proven (no `organizationId` anywhere in the
  query or table); license-status gating proven (a `DEVELOPMENT_ONLY` source
  is excluded when the deployment flag says production-only).
- **Tests:** Real hybrid search against real embedded content; a
  deliberately-forced test proving a `DEVELOPMENT_ONLY` row is excluded
  under the production-gated flag; article-number-lookup tests (plain
  integer, sub-numbered, no-article-in-question unchanged path, article
  number absent from corpus doesn't error, direct match respects the same
  `legal_status`/`license_status` scoping as the two hybrid legs,
  instrument-named lookup scopes to and boosts only the correct source when
  the same number exists elsewhere too, no-instrument-named ambiguous lookup
  withholds the boost and falls back to hybrid results without erroring).
  30/30 passing in `search.test.ts`, 77/77 shared-package-wide. Live
  (non-mocked) re-verification of all three article-number-lookup cases
  (instrument-scoped, ambiguous-fallback, unique-unchanged) against the real
  database — see this section's cross-source ambiguity note above for the
  actual before/after evidence.
- **Risks:** ~~`'simple'`-config full-text quality for Arabic is unproven
  until tested against real queries — budget time to evaluate result
  quality, not just "does the query execute."~~ **Resolved (2026-08-14),
  evidence-based:** manually reviewed against a 20-question real sample
  (Code of Obligations and Contracts) covering specific-article, conceptual,
  casual-phrasing, and single-keyword queries. 17/20 questions had a
  completely empty `fullTextCandidates` (expected — `'simple'` has no
  Arabic stopword list, so a full natural-language question ANDs every word
  including function words); only 1/20 had a full-text-only chunk reach the
  final fused top-8, well under the 20% "actively misleading" threshold set
  for this decision, and that one hit was plausibly relevant. Full-text
  performed as designed on its best case (single-keyword queries) without
  polluting results elsewhere. **Decision: hybrid retrieval ships as
  originally designed — no vector-only fallback.** Separately, this same
  review surfaced that vector search alone also missed on three genuinely
  hard semantic queries (tortious liability, express resolutory clause,
  unjust enrichment) — logged as a retrieval-quality gap in
  `DOMAIN_REVIEW_BACKLOG.md`, explicitly out of scope for Phase 6 to chase.

### Batch 5 — Citation verification + legal query API

- **Scope:** New prompt (`prompts/legal-kb-ask/v1.md`) with explicit
  authority-attribution instructions (Section 7); new schema/registry entry;
  `answerLegalKbQuestion()` in `investigator.ts` (reusing `answerQuestion()`
  unchanged); `enrichLegalSources()`; the new article-existence check
  (Section 10); `packages/api` controller/service/routes for the query
  endpoint (organization-authenticated, globally-scoped content, per Section
  4.3).
- **Files:** New prompt/schema files; `retrieval/investigator.ts` (new thin
  wrapper, existing `answerQuestion()` untouched); new
  `packages/api/src/{controllers,services,schemas,types,routes}/legal-kb*`
  files, following the `organization-brain-investigator.*` naming/shape
  precedent exactly.
- **Depends on:** Batch 4.
- **Acceptance criteria:** A real question against real indexed legal
  content returns a citation-verified answer identifying instrument, article,
  and source — matching every criterion Phase 3/5 already had to prove, plus
  the new article-existence check; a deliberately forced fabricated-citation
  case is rejected/regenerated, same discipline as the existing
  `FORCE_INVALID_CITATION_MARKER` test pattern.
- **Tests:** Mirrors `investigator.test.ts`'s existing structure — a new
  `describe("answerLegalKbQuestion", ...)` block, including the citation
  rejection proof.
- **Risks:** Prompt quality for Lebanese legal Arabic content is unproven —
  this is the first Arabic-primary content this pipeline has ever generated
  answers from; budget real iteration here, not just plumbing verification.
- **Completed — real citation-rejection rate, root-caused and measured
  (2026-08-14):** An initial 5-question live sample showed a ~40%
  citation-rejection rate; per-citation diagnosis (real cited excerpt vs.
  real `LegalChunk` content, side by side) plus a larger 15-question sample
  (13/15 accepted, 2 rejected) put the trustworthy combined rate at 4/20 =
  20%, split evenly at the question level between near-miss causes
  (formatting/orthographic — whitespace-before-punctuation, alef-hamza
  variance, ordinal-to-digit list reformatting, ellipsis-based elision) and
  genuine-mismatch causes (cross-chunk misattribution of real text being
  the dominant sub-type — 4 of 5 genuine citation instances — not
  fabrication or paraphrase). Two narrow, provably meaning-preserving fixes
  followed: `citations.ts`'s `normalize()` gained whitespace-before-
  punctuation and alef-hamza (أ/إ/آ/ٱ↔ا) normalization (regression-tested
  against all `verifyCitations()` callers — Contracts, Organization Brain,
  Legal KB share one implementation — with an explicit test proving a
  genuinely reworded excerpt still gets rejected after the change); and
  `legal-kb-ask/v1.md` gained three targeted instructions (don't convert
  ordinals to digits, don't splice non-adjacent text with an ellipsis,
  attribute excerpts precisely when source blocks are similar). A fresh
  re-measurement on the same 20-question sample plus the same diagnostic
  method afterward showed 17/20 = 85% accepted (up from 16/20 = 80%): the
  whitespace-before-punctuation fix confirmed live on a previously-untested
  question, and the cross-chunk-misattribution question passed clean this
  run. Two near-miss sub-types (ordinal-to-digit conversion, elision
  without a literal ellipsis) reproduced even after the prompt change —
  genuinely unresolved, not swept under the rug — and a new,
  distinct rejection surfaced from the unrelated `verifyArticleExistence()`
  check (a cross-reference to a different instrument's article embedded in
  otherwise 100%-accurate quoted text). All residual causes are logged in
  `DOMAIN_REVIEW_BACKLOG.md` under "Legal KB Answer Generation — Residual
  Citation-Rejection Causes" as an acknowledged, ongoing prompt-quality
  item — Batch 5 does not require zero rejections to be complete, only
  that the safe fixes are applied and the residual risk is honestly
  measured and documented.

### Batch 6 — Evaluation and hardening

- **Scope:** New Legal KB golden-set cases (grounding, hallucinated-article,
  insufficient-source, adversarial); `jurisdiction: "LB"` populated for real;
  doc updates (the stale phase-status tables, Section 0.1).
- **Files:** `packages/shared/ai/evaluation/golden-set.ts`, new fixtures
  under `evaluation/fixtures/`, `docs/AI_ROADMAP.md` and
  `docs/AI_IMPLEMENTATION_GUIDE.md` status-table corrections.
- **Depends on:** Batch 5.
- **Acceptance criteria:** `npm run eval` passes against real Legal KB
  cases; every Batch 1–5 acceptance criterion re-verified together, end to
  end, on a clean environment.
- **Tests:** Golden-set run; full regression of existing (Contract,
  Organization Brain) retrieval tests to confirm no shared-engine regression.
- **Risks:** Lowest technical risk of the six batches; highest scope-creep
  risk (easy to start writing cases that quietly require legal judgment this
  team doesn't have — see Section 11's engineering-vs-legal-reviewer table,
  re-apply it per case).
- **Completed — golden set built, a real bug found and fixed, full phase
  re-verified end to end (2026-08-14):** Nine Legal KB golden-set cases
  added (`packages/shared/ai/evaluation/legal-kb-golden-set` machinery,
  `LEGAL_KB_GOLDEN_SET` in `golden-set.ts`), run via a dedicated
  `runLegalKbGoldenSet()` since the existing single-completion-call harness
  can't exercise a RAG pipeline — reported together with the original
  golden set under one `npm run eval`. Building the "temporal metadata"
  and "hallucinated article number" cases surfaced a real, reproducible
  bug: the model declined two direct-article-number questions despite
  `searchLegalKbChunks()` correctly guaranteed-including the exact right
  chunk. Diagnosed live (not assumed) — two competing theories (anchoring
  on the prompt's worked decline example; distraction from surrounding
  irrelevant chunks) were tested and ruled out; the real cause was that no
  SOURCE block ever told the model which article number it was, so the
  model had no citable basis to attribute a claim to "Article N" and
  correctly declined rather than guess. Fixed by threading the real
  `article_number` through `RetrievedChunk` (Legal KB only — proven absent,
  not merely null, on Contract/Organization Brain chunks) into an
  `article=N` SOURCE-block tag, plus one prompt line making that tag
  citable directly. Full `LEGAL_KB_GOLDEN_SET` re-run post-fix: 9/9, no
  regression on the 7 already-passing cases. Contract/Organization Brain's
  existing suites re-run clean (93/93 shared, 258/258 api, 39/39 workers).
  Separately, a full end-to-end pass across all six batches (schema/data,
  retrieval, generation/citation, evaluation, and one cross-batch
  integration question) re-confirmed every batch's own findings still
  hold, and surfaced two pieces of information outside any single batch's
  scope: a self-corrected gap in live-verification method (this session's
  own scripts inconsistently forced `AI_PROVIDER_MODE`, and the mock
  embedding provider silently zero-vectors pure-Arabic text — not a
  product defect), and a real, general monorepo build-ordering fact (an
  isolated `packages/api` production build resolves `@starter-kit/shared`
  against `dist/`, not source — documented in the root `README.md`'s new
  "Building" section, not specific to Phase 6). Full detail for both in
  `docs/DOMAIN_REVIEW_BACKLOG.md`'s "Legal KB Direct Article Lookup" entry
  (now resolved). **Phase 6 is complete, full stop** — not "complete
  pending legal review": this project has no real production deployment
  planned, so the qualified-legal-reviewer requirement (Section 11's
  engineering-vs-legal-reviewer table; the Risks entry below) is genuinely
  out of scope, not waived. See `docs/DOMAIN_REVIEW_BACKLOG.md`'s "Legal KB
  Qualified-Legal-Reviewer Requirement" entry for the full reasoning. The
  gating code itself (`LEGAL_KB_LICENSE_MODE` fail-closed default,
  `DEVELOPMENT_ONLY` on all five sources, the production-clearances
  registry) is unchanged and would matter again exactly as designed if that
  ever stops being true.

---

## 15. Risks

- **Arabic full-text search quality is unproven** (`'simple'` config,
  Section 0.5/9) — the single largest unknown that isn't a "we'll figure it
  out," but a named, accepted MVP limitation.
- **Two of five sources have real, unresolved factual discrepancies**
  (Code of Commerce's promulgation date; Law 81/2018's Gazette date) that
  ingestion will faithfully encode as-is — Clausio would be reproducing an
  uncertainty, not introducing one, but the citation/prompt design must not
  paper over it (e.g., a `lastVerifiedAt`-adjacent flag or note surfaced when
  a source has an open discrepancy — worth deciding during Batch 2/5, not
  silently dropped).
- **No qualified legal reviewer exists yet** (`AI_ROADMAP.md` Section 8.2,
  unchanged by this plan) — Phase 6 engineering can complete and the system
  can work correctly _as a retrieval pipeline_ while still not being
  legally trustworthy content — this gap is inherent to the phase, not a
  Phase 6 engineering defect to solve. **Scope clarification (2026-08-14):**
  this project has no real production deployment planned (educational/
  portfolio build, no real users), and the reviewer requirement exists
  specifically to protect real users from unreviewed legal content — a risk
  that can't occur without real users. So for this project as currently
  scoped, this item is out of scope rather than open; it is not waived, and
  would apply again exactly as designed if the project's scope ever changed
  to include a real deployment. Full reasoning in
  `docs/DOMAIN_REVIEW_BACKLOG.md`'s "Legal KB Qualified-Legal-Reviewer
  Requirement" entry.
- **Licensing remains unresolved for all five sources** — this plan builds
  the mechanism to keep development and production cleanly separable, but
  does not and cannot resolve the underlying licensing question itself.
- **Cost**: embedding ~2,000+ articles across 5 sources is a one-time (or
  occasional, on re-ingestion) cost, not large in absolute terms, but worth
  a rough estimate before running for real rather than assuming it's
  negligible.
- **Ingestion coupling to a single, non-versioned external site**: if
  `legallaw.ul.edu.lb`'s HTML structure changes, the scraper breaks silently
  until the next re-ingestion is attempted — mitigated somewhat by the raw
  snapshot archive (Clausio keeps its own copy) but not by any live
  monitoring, which is out of scope for this phase.

---

## 16. Explicit Non-Goals For Phase 6

- No new retrieval engine, chunking engine, embedding pipeline, or citation
  mechanism — everything reuses the existing shared implementation (Section 3).
- No resolution of the `Contract.governingLaw`/jurisdiction Domain Review item.
- No full historical/point-in-time legal versioning (Option 2, Section 5).
- No multi-language linked-record modeling (every current source is
  Arabic-only).
- No jurisprudence, doctrine, or administrative-guidance content — the
  `authorityTier` enum reserves the values; the corpus doesn't populate them.
- No expansion beyond the five validated documents.
- No production licensing resolution — that's a non-engineering dependency
  this plan structurally accommodates but does not solve.
- No new platform-admin HTTP authorization layer — ingestion stays
  script-triggered for this phase.
- No AI Assistant integration (Phase 7) — Legal KB becomes one of the
  Assistant's future tools, per the frozen roadmap, but that wiring is
  explicitly out of scope here.
- No real Arabic-dictionary full-text search extension — `'simple'` config
  only, named as a limitation, not solved.
- No automatic re-verification/re-scraping schedule — `lastVerifiedAt`
  exists to make staleness visible, not to prevent it automatically.

---

## 17. Recommended Implementation Order

Batches 1 → 2 → 3 → 4 → 5 → 6, strictly sequential — each genuinely depends
on the previous one's output (schema before ingestion, ingestion before
chunking, chunking before retrieval, retrieval before the query API,
everything before evaluation). Unlike Phases 2/3/4 (which could run in
parallel because they touched disjoint files/models), Phase 6's batches
share one small set of new files end-to-end and don't have that same
parallelization opportunity — flagged here so it isn't assumed by analogy
to the earlier phases.

The **Code of Obligations and Contracts** should be the first (and, for
Batch 2–3's initial proof, possibly only) source carried through Batches
2–5 end-to-end before the remaining four are ingested — it's the strongest
single candidate per the validation report (cleanest independent
corroboration via NATLEX, directly-verified amendment integration), and
proving the full pipeline against one real, complex source before scaling to
five is lower-risk than parallelizing across all five immediately.

---

## Summary

### A. Recommended Architecture

Two new, non-organization-scoped Prisma models — `LegalSource` (document/
instrument level) and `LegalChunk` (retrieval unit, article-aware) —
extending the exact two-level pattern `ContractChunk`/`OrganizationBrainChunk`
already established, with `articleNumber`, `amendingInstrument`/
`amendmentEffectiveDate`, and licensing/provenance fields as the only
justified additions. Every retrieval, chunking, embedding, RRF-fusion, and
citation-verification mechanism is reused unchanged, parameterized through
the same `ops`/`fetcher` pattern already proven twice. Ingestion is a
purpose-built HTML scraper (not a reuse of the opaque-file
extraction/heading-detection pipeline), because the source provides real
structure the existing heuristics would otherwise discard — and because
those heuristics don't work on Arabic text regardless. Versioning stores
current, amendment-annotated text only (no historical text, because none is
sourceable yet), with a clear, additive path to full versioning later.
Development/production separation is enforced by a `licenseStatus` column
and a deployment-level filter, not by convention.

### B. Decisions Requiring Your Approval

The eleven Domain Review items in Section 13 — most consequentially: the
new global (non-org-scoped) table pattern itself (#2), the versioning
approach (#3, recommend Option 1), the ingestion-trigger mechanism (#7,
recommend operator script over new platform-admin API), and the Arabic
full-text search compromise (#8, recommend `'simple'` config for MVP).

### C. Proposed Implementation Batches

Six, strictly sequential: schema foundation → scraping/structure extraction
→ chunking/embeddings → retrieval integration → citation + query API →
evaluation/hardening (Section 14). Each has its own scope, files, acceptance
criteria, tests, and risks stated explicitly; none has been started.

### D. Things We Should NOT Implement Yet

Full historical versioning, multi-language linked records, jurisprudence/
doctrine/administrative-guidance content, expansion beyond five documents,
production licensing resolution, a new platform-admin auth layer, real
Arabic-dictionary full-text search, Phase 7 Assistant integration,
automatic re-scraping — all listed with reasoning in Section 16.

### E. Questions Requiring External / Legal Verification

Everything already named `[REQUIRES LEGAL REVIEW]` in
`PHASE6_LEGAL_CORPUS_VALIDATION.md` (licensing/reuse rights for all five
sources), plus: the Code of Commerce promulgation-date discrepancy
(4/12 vs 24/12/1942), the Law 81/2018 Gazette-date discrepancy, whether any
post-2018 amendment or implementing decree affects Law 81/2018's
currentness, and — the one this plan adds — whether any known public
Lebanese-law QA benchmark exists that this planning pass simply isn't aware
of (Section 11). None of these are resolved by, or block, the engineering
plan above; they gate what the _content_ can be trusted to say, not whether
the _pipeline_ can be correctly built.
