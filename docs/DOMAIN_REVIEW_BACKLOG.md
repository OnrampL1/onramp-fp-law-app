# Domain Review Backlog

Business concepts identified while implementing a feature, deliberately
deferred rather than added ad hoc. Nothing here gets built just because
it's on this list — each item still needs its own Domain Review before it
touches the DDS or the schema. This file just makes sure we don't forget
what we noticed.

## Open Items

### Contract Value

- Identified: Contract List feature (2026-07-12)
- Classification: Valuable product enhancement
- Status: Architecture frozen — see `docs/AI_ARCHITECTURE.md` (Phase 2,
  Section 16). Not yet implemented.
- Notes: Not a single scalar — real contracts mix one-time fees, recurring
  payments, and multiple concurrent schedules, plus currency handling.
  Belongs to the same design as Risk: a versioned, per-`AIAnalysisType`
  Zod schema under `packages/shared/ai/schemas/` (AI_ARCHITECTURE.md
  Section 3.3/11), not a hand-copied field solved independently.

### Risk (structured, per-contract)

- Identified: Contract List feature (2026-07-12)
- Classification: Valuable product enhancement
- Status: Architecture frozen — see `docs/AI_ARCHITECTURE.md` (Phase 2,
  Section 16). Not yet implemented.
- Notes: Currently exists only as free text inside `AIAnalysis.result`
  (type `RISK`) — no structured, queryable severity per contract. Same
  design as Contract Value; both are structured-output schemas for the
  AI Analysis pillar, not separate mechanisms.

### Jurisdiction / Governing Law

- Identified: AI roadmap freeze discussion (2026-08-10)
- Classification: Required for correctness — the Lebanese Legal Knowledge
  Base (`docs/AI_ROADMAP.md` Phase 6) cannot retrieve relevant law without
  knowing which jurisdiction a contract or organization is governed by.
- Status: Confirmed absent — no `jurisdiction` or `governingLaw` field
  exists anywhere in `packages/shared/prisma/schema.prisma` today (checked
  directly against the schema). Not yet designed, not yet implemented.
- Notes: Must be resolved before Phase 6 implementation begins, not
  discovered mid-phase. Open questions for the Domain Review: whether
  `Contract` needs a `governingLaw` field, whether `OrganizationSettings`
  needs a jurisdiction/preferred-law setting, whether both are required,
  how multiple jurisdictions should be represented (a contract's governing
  law can differ from the org's home jurisdiction), and how
  historical-vs-current jurisdictional context should work (a contract
  signed under a since-amended law). See `docs/AI_ROADMAP.md` Section 8.1
  for full context. Does not block current Phase 3/4 engineering work.

### Contract Type / Categorization

- Identified: Contract List feature (2026-07-12)
- Classification: Open question — not yet justified as a real requirement
- Status: Rejected as a generic string field for now
- Notes: Frontend mock data has a `type` column (MSA/NDA/License/etc.), but
  no business rule was identified that actually requires it. Revisit only
  if a genuine categorization need emerges — design a proper enum/entity
  then, not a free-text field now.

### Legal Source Historical Text Availability (Phase 6 versioning premise)

- Identified: Batch 2 live cross-check against legallaw.ul.edu.lb, Code of
  Obligations and Contracts, Article 844 (2026-08-14)
- Classification: Flag for a future decision — does not block or change any
  current batch's work. Option 1 (current-only text, no historical
  versioning) remains the implemented approach.
- Status: Open, not resolved. Logged for whoever next revisits the Phase 6
  versioning decision (see "Lebanese Legal Knowledge Base — Phase 6 Domain
  Review" below, decision 3, and `docs/PHASE6_IMPLEMENTATION_PLAN.md`
  Section 5).
- Notes: Article 844's real page includes a section labeled "النص السابق
  للمادة" ("previous text of the article"), showing the pre-amendment
  wording with its own validity date range (09/03/1932-29/03/2019), directly
  on the same page as the current text. Section 5's stated rationale for
  Option 1 is that sources note *that* and *by what* an article was amended
  but do not preserve the superseded wording itself — this appears not to
  hold, at least for this one article. Caveats: only one article has been
  inspected this deeply, not a survey — unknown whether a "previous text"
  section is reliably present for every amended article or specific to this
  one; the previous text shown here is nearly identical to the current text
  (the 2019 amendment only added a sentence permitting single-person company
  formation), so this doesn't prove the site preserves deep multi-revision
  history, only that at least the immediately-prior version is available for
  this amendment event. Incidental, same-category finding logged alongside:
  the real page also includes a full French translation of the article,
  directly contradicting `PHASE6_LEGAL_CORPUS_VALIDATION.md`'s
  `[UNVERIFIED]` tag on French-text availability for this source.
- **Update, 2026-08-15 — do not conflate with the separate
  multi-`LawArticleID` finding below.** A follow-up investigation (Code of
  Commerce, Article 16, `LawArticleID` 982862 vs. 1056370 — two different
  IDs listed for the same article number in `AmendedArticles.aspx`) was
  suspected to be a second instance of "superseded text served under a
  different ID." Direct comparison showed it is **not**: both IDs return
  byte-for-byte identical, current content, including the same inline
  "previous text" sections. The two IDs are duplicate access paths to the
  same record (the `AmendedArticles.aspx` listing groups rows by amending
  instrument, so one article amended by two different laws over time
  appears twice, each occurrence getting its own row/ID) — not two
  different versions of the text. This finding is walked back; it does not
  affect or resemble the Article 844 finding above, which remains open and
  unresolved. The Article 844 finding is about the *same record*
  preserving superseded wording inline; the Commerce-16 investigation was
  about *different records* possibly disagreeing — they turned out not to.

### Legal KB Retrieval Quality Gap — Doctrinal Terminology vs. Statute Wording

- Identified: Batch 4 manual Arabic retrieval-quality review, 20-question
  real sample against the Code of Obligations and Contracts (2026-08-14)
- Classification: Retrieval-quality limitation, not a Phase 6 defect —
  per the plan's own principle that a model/retrieval-quality problem is a
  separate, evidence-based decision, not something to patch silently inside
  Batch 4. Logged so it isn't rediscovered from scratch later.
- Status: Open, explicitly out of scope for Phase 6 to chase.
- Notes: Three questions in the sample returned no relevant results even
  from vector search alone (full-text was empty on all three too, so this
  isn't the hybrid-vs-vector-only question — see the Batch 4 entry above):
  - "شو هي المسؤولية التقصيرية؟" (What is tortious/delictual liability?) —
    top hits were about custodianship and bailee liability, not delict.
  - "ما هو الشرط الفاسخ الصريح؟" (What is an express resolutory clause?) —
    top hits were about promissory-note form requirements, unrelated.
  - "الإثراء بلا سبب" (Unjust enrichment) — top hits were about force
    majeure and cause-of-obligation, not unjust enrichment.
  Likely cause: the 1932 statute's own wording doesn't use the modern
  doctrinal terms a question would naturally use, and/or a real embedding-
  quality limit on this specific vocabulary gap — neither has been
  investigated further. A model/embedding-provider change or a
  terminology-expansion layer would be the kind of fix to evaluate, each
  requiring its own evidence-based decision (`AI_ROADMAP.md` Section 7),
  not a Phase 6 patch.

## Resolved Items

### Legal KB Article-Number Lookup — Cross-Source Ambiguity

- Identified: Batch 4 acceptance-criteria live verification (2026-08-14),
  not a user-reported bug — surfaced by re-running the newly-built
  article-number direct-lookup feature against the real, multi-source
  database rather than the single-source mock fixtures its unit tests used.
- Classification: Correctness bug in newly-shipped code, fixed same-day
  before Batch 4 was called complete.
- Status: **Resolved (2026-08-14).**
- Notes: `article_number` is unique only *within* one `LegalSource`, not
  across the corpus. Live proof: `article_number = '654'` matches a row in
  both the Code of Obligations and Contracts (an employment/service-hire
  termination clause) and the Code of Commerce (an unrelated
  bankruptcy-rehabilitation clause). The original implementation returned
  both at the same guaranteed-inclusion priority regardless of which
  instrument the question named — false confidence on a wrong-source match,
  worse than no boost at all. Fixed via a small instrument-alias table that
  scopes the lookup to the named source when one is given, and withholds
  the guaranteed-inclusion boost entirely (falling back to ordinary hybrid
  search) when no instrument is named and the number is genuinely ambiguous
  across sources. Live re-verification of the same Article 654 case,
  post-fix: instrument named → exactly 1 correctly-sourced boosted result;
  no instrument named (ambiguous) → 0 boosted results, ordinary hybrid
  results only, no error; no instrument named + a confirmed-unique article
  number → unchanged. Full detail and evidence in
  `docs/PHASE6_IMPLEMENTATION_PLAN.md` Section 9.

### Lebanese Legal Knowledge Base — Phase 6 Domain Review

- Identified: `docs/PHASE6_IMPLEMENTATION_PLAN.md` Section 13 (2026-08-12)
- Classification: Required for correctness — Phase 6 cannot begin schema
  work without these decisions frozen, per `CLAUDE.md`'s Domain Review
  Workflow.
- Status: **Approved** (2026-08-12). Full detail lives in
  `docs/PHASE6_IMPLEMENTATION_PLAN.md`; this entry records the outcome, not
  the reasoning.
- Decisions:
  1. New models `LegalSource`, `LegalChunk` and enums `LegalSourceType`,
     `LegalAuthorityTier`, `LegalStatus`, `LegalLicenseStatus` — approved,
     per the plan's Section 6 design.
  2. Legal KB is global/non-organization-scoped: no `organizationId` on
     either table, no org filter in retrieval. The asking organization is
     still recorded on `AICallLog.organizationId` for observability/cost
     attribution — global content, organization-attributed usage.
  3. Versioning: **current-only** consolidated text with amendment
     metadata (Option 1 of the plan's Section 5). No historical/
     point-in-time legal versioning in Phase 6. **Note:** `AI_ROADMAP.md`
     Section 6's versioning paragraph ("Legal sources must not be
     overwritten... so historical and current law remain distinguishable")
     predates this decision and reads as asking for more than Option 1
     delivers. Reconciled as: the *spirit* (don't silently treat law as
     static, keep amendment awareness) is satisfied via amendment metadata
     + `lastVerifiedAt` + explicit no-historical-claim behavior; the
     *literal* "not overwritten" wording no longer matches the approved
     mechanism (re-ingestion replaces chunks, same as `ContractChunk`/
     `OrganizationBrainChunk` today). `AI_ROADMAP.md` Section 6 needs a
     short wording correction to match — tracked as part of the
     documentation housekeeping in decision 11, not a reopened design
     question.
  4. `deletedAt` soft delete on `LegalSource`; FK-level `onDelete: Cascade`
     from `LegalSource` to `LegalChunk` (fires only on a genuine hard
     delete, mirroring `ContractChunk`/`OrganizationBrainChunk`). Retrieval
     must separately exclude a soft-deleted source's chunks at query time —
     a Batch 4 (retrieval) requirement, not a Batch 1 (schema) one.
  5. `articleNumber: String?`, nullable and indexed. No Book/Title/Chapter
     composite model in Phase 6.
  6. Enum vocabularies taken verbatim from `AI_ROADMAP.md` Section 6 —
     no competing taxonomy invented.
  7. Ingestion trigger: an operator-invoked script (no new platform-admin
     HTTP auth layer), which enqueues work through the existing BullMQ
     worker/job conventions rather than doing everything synchronously
     in-process — combines what the plan listed as separate items 7 and 9
     into one pipeline design (see item 9).
  8. Arabic full-text search: PostgreSQL `'simple'` configuration for MVP.
     No stemming extension. Real Arabic retrieval quality must be tested
     and the limitation documented (Batch 4). **Tested, 2026-08-14:**
     20-question real sample against the proof source — 1/20 questions had
     a full-text-only chunk reach the final fused top-8 (well under the
     20% threshold set for this decision), 17/20 had completely empty
     `fullTextCandidates` (expected — no Arabic stopword list under
     `'simple'`). **Decision: hybrid retrieval ships as designed, no
     vector-only fallback.** Full detail in
     `docs/PHASE6_IMPLEMENTATION_PLAN.md` Batch 4's Risks entry. A separate,
     unrelated retrieval-quality gap surfaced by the same review is tracked
     as its own Open Item above ("Legal KB Retrieval Quality Gap").
  9. Ingestion job execution reuses the existing BullMQ worker/job
     conventions (retryable-vs-terminal shape, per-queue worker) rather
     than a new execution architecture — see item 7.
  10. License gating: `LegalLicenseStatus` (`DEVELOPMENT_ONLY` /
      `UNDER_REVIEW` / `CLEARED_FOR_PRODUCTION`), deployment-level filter,
      following the existing `AI_PROVIDER_MODE`-style config pattern — no
      new licensing subsystem.
  11. `AI_ROADMAP.md` and `AI_IMPLEMENTATION_GUIDE.md` stale Phase 3/4/5
      status tables corrected as documentation housekeeping (done alongside
      this entry).
- Additional scope constraints approved alongside the 11 decisions:
  single-source proof (Code of Obligations and Contracts only) before
  scaling to the remaining four; exactly the five already-researched
  sources, no silent expansion; none of the five may be marked
  `CLEARED_FOR_PRODUCTION`; `promulgatingAuthority` (the legal instrument/
  Lebanese Republic) and `compilerSource` (Lebanese University) stay
  distinct fields, never conflated; the Code of Commerce date discrepancy,
  the Law 81/2018 Gazette-date discrepancy, licensing, and legal
  correctness all remain open and are not resolved by this decision.

### Effective Date

- Identified: Contract List feature (2026-07-12)
- Classification: Required for correctness (completes the contract
  lifecycle — we tracked when a contract ends but not when it starts)
- Resolution: Approved. Implementation in progress.
