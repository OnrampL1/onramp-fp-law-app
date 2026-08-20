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

### Legal KB Answer Generation — Residual Citation-Rejection Causes (post-normalization-fix)

- Identified: Batch 5 diagnostic sample (5 + 15 = 20 real Arabic questions
  against the live API, 2026-08-14), root-caused per-citation rather than
  guessed at.
- Classification: Prompt-quality/model-behavior limitation, not a
  citations.ts defect — deliberately left unfixed per the plan's principle
  that this needs real iteration over time, not a Phase 6 patch chased to
  zero. `verifyCitations()`'s strict-match design (AI_ARCHITECTURE.md
  Section 6 — "never show a fabricated citation") is intentionally
  preserved; these are cases where the model itself produced text that
  doesn't verbatim-match its source, which no normalization can safely fix
  without weakening the fabrication check.
- Status: Open. Two rounds of fixes already applied and measured (see
  `PHASE6_IMPLEMENTATION_PLAN.md` Batch 5 section for full before/after
  numbers); what's below is what survived both rounds.
- Fixes already applied (do not re-attempt these — already shipped):
  - `citations.ts`: whitespace-before-punctuation and alef-hamza
    (أ/إ/آ/ٱ↔ا) orthographic normalization, added to `normalize()` — both
    confirmed provably meaning-preserving, regression-tested to still
    reject genuinely reworded/fabricated excerpts, and confirmed live to
    fix a real case in the fresh sample.
  - `legal-kb-ask/v1.md`: explicit instructions added not to convert
    spelled-out Arabic ordinals to digits, not to splice non-adjacent text
    with an ellipsis, and to attribute each excerpt to its exact
    `chunkId` when several similar source blocks are present.
- Notes — what's still causing rejections after both fixes, per the
  live re-measurement:
  - **Ordinal-to-digit list reformatting** (e.g. اولا/ثانيا/ثالثا →
    1/2/3): **resolved, 2026-08-15** — see the "Legal KB Ordinal-to-Digit
    Citation Normalization" entry under Resolved Items below. A third
    prompt-instruction attempt was deliberately not tried, since the first
    one measurably did nothing; fixed instead by a curated citations.ts
    normalization, same category as the whitespace/alef-hamza fixes above.
  - **Elision without a literal ellipsis**: on
    "هل يمكن فسخ عقد الايجار لعدم الدفع؟", attempt 1 (pre-fix behavior)
    used "..." to splice two non-adjacent list items into one excerpt;
    after the prompt change, attempt 2 stopped using "..." but instead
    silently dropped the two skipped list items and concatenated the
    remaining text with a bare newline — same non-contiguous-splice
    problem, just without the character the prompt told it not to use.
    The instruction addressed the letter of the pattern, not the
    underlying behavior. **A second, differently-shaped fix was tried
    (2026-08-15) and also failed**: rather than another "don't do X"
    instruction, `legal-kb-ask/v1.md` was rewritten to explicitly direct
    the model to cite non-adjacent relevant spans as separate entries in
    "sources" (the schema already supports multiple citations per answer —
    confirmed, not assumed), with a concrete worked example mirroring this
    exact failure shape. Live re-verified, 2/2, against the real pipeline:
    the model ignored the new instruction entirely and spliced with a
    literal "..." again, identically to the original behavior. Unlike the
    ordinal case, no citations.ts normalization fix is safe here either —
    there's no curated, unambiguous way to reconstruct which two
    non-adjacent spans were meant to be joined without weakening the
    fabrication check for genuinely-spliced fabricated text. The prompt
    rewrite was reverted afterward, since it didn't help and there's no
    reason to carry an ineffective change — `legal-kb-ask/v1.md` is back to
    its original wording (the excerpt-must-be-contiguous rule as it existed
    before this attempt). **Confirmed unresolved after two independent fix
    attempts; not chased further** —
    see case 026 in `LEGAL_KB_GOLDEN_SET` (still a known-issue regression
    watch, now the last one).
  - **Cross-chunk misattribution** (real text, attached to the wrong
    `chunkId` among several similar source blocks): the one question that
    exhibited this in the original sample
    ("ما هي أحكام حماية البيانات الشخصية؟") was accepted clean in the
    fresh re-measurement. Encouraging, but it's one data point on one
    question — not confirmed fixed, just not reproduced this time.
  - **New, distinct finding**: `verifyArticleExistence()` (unrelated to
    this batch's changes) rejected
    "ما هي الشروط الواجب توافرها في الشيك؟" — the model's cited excerpt
    was 100% accurate and verbatim, but the quoted source text itself
    contains a cross-reference to "المادة 409 من قانون التجارة البرية" (a
    different instrument's article), and the model's answer prose
    repeated that number. The source-scoped existence check (correctly,
    per the Batch 4 cross-source lesson) can't verify an article number
    against an instrument that wasn't actually cited — even when the
    number only appears because the cited text itself mentions it as a
    cross-reference. Not a fabrication; a real edge case in how
    "mentioned article numbers" are extracted from prose that itself
    quotes a cross-reference. Logged, not fixed — same "don't chase to
    zero in Phase 6" reasoning applies.

### AI Analysis Overview Endpoints 500 on Seeded Contracts — Seed Data Bug, Not Application Logic

- Identified: Incidentally, while browser-testing the global search feature
  (2026-08-17) — clicking a live search result for "Master Services
  Agreement" (contract `00000000-0000-4000-8000-000000000301`) landed on
  Contract Details with "Couldn't load the AI summary" and a 500 from both
  `GET /contracts/:id/risk-overview` and `GET /contracts/:id/summary-overview`.
  Not caused by, or related to, the search feature — search only navigated
  there; this is pre-existing AI Analysis behavior. Root-caused directly
  against the real dev DB, not guessed at.
- Classification: Real, reproducible bug in `packages/shared/prisma/seed.ts`,
  not an `ai-analysis.service.ts` logic bug — the service's 500s here are
  arguably correct defensive behavior (refusing to serve a stored analysis
  result that doesn't match its recorded schema) reacting to bad seed data.
  Owner: wahabtlais (AI Analysis / seed data area).
- Status: Open. Not fixed — out of scope for the search feature.
- Root cause, confirmed by querying the dev DB directly
  (`prisma.aIAnalysis.findMany` for this contract): both its `SUMMARY` and
  `RISK` rows have `status: "COMPLETED"` but `schemaVersion: null` and
  `result: null`. Two contributing bugs in `seed.ts`, both around line 800:
  1. `AnalysisSeed` (the seed file's own interface, ~line 328) and the
     `prisma.aIAnalysis.upsert(...)` `create` block never set
     `schemaVersion` at all — so `getRiskOverview`'s
     `if (!analysis.schemaVersion) throw createError(..., 500)` guard
     (`ai-analysis.service.ts` line 189) will 500 for **every** seeded RISK
     analysis on a fresh database, not just this one contract. This is
     systemic, not contract-specific.
  2. The upsert's `update: {}` (line 802) is a no-op on conflict — for a
     contract ID that already exists in the target database from an earlier
     seed-script revision, re-running `npm run db:seed` never refreshes
     `result`/`modelVersion`/etc. to match what `seed.ts`'s source currently
     defines. This contract's source code (`seed.ts` ~line 405) *does*
     define a real `result: { text: "..." }` payload for both analyses, but
     the DB has `result: null` — meaning this row predates that payload and
     has silently drifted ever since, invisible to anyone just reading
     `seed.ts`.
  Both bugs likely affect the other seeded contracts with `aiAnalyses`
  entries too (at least the ones referenced at `seed.ts` lines 596 and 743)
  — not independently verified per-contract, only this one was traced end
  to end.
- Notes: Fixing likely needs both a `schemaVersion` value added to the seed
  data/create call (so it actually matches whatever
  `getRiskSchemaForVersion` expects) and either a real `update` clause on
  the upsert (so re-seeding heals drifted rows) or a documented "wipe and
  reseed" step for local dev. Neither attempted here — belongs to whoever
  owns this area.

## Resolved Items

### Labour Law Flat-View Parser — "Preliminary Provisions" Articles Left with a Null Heading Path

- Identified: Post-Batch-6 review of Labour Law extraction output
  (2026-08-15).
- Classification: Real, narrow parser gap — the Labour Law's own table of
  contents (in the real fixture page) lists "احكام اولية" (Preliminary
  Provisions, articles 1-9) as its own top-level section before "الباب
  الاول", a fourth `<h2>` heading kind alongside Book/Chapter/article that
  `legal-source-flatview-parser.ts` didn't recognize. Its 9 articles fell
  through to `headingPath: null` since neither `currentBook` nor
  `currentChapter` had been set yet at that point in the document.
- Status: **Resolved (2026-08-15).**
- Fix: added `PRELIMINARY_PROVISIONS_HEADING_PATTERN` (matching `^احكام
  \s*اولية`) alongside the existing Book/Chapter patterns, treated as
  Book-level (sets `currentBook`, resets `currentChapter`) since it plays
  the same top-level-section role structurally.
- Verification: before the fix, exactly 9 of 125 real Labour Law articles
  (articles 1-9) had `headingPath: null`; after, 0 of 125 do — confirmed
  directly against the real fixture page, not assumed. Two new tests added
  (`legal-source-flatview-parser.test.ts`): one asserting article 1 gets a
  real, single-level heading path, one asserting no article in the real
  page has a null heading path at all. Full parser suite: 11/11 (was 9/9).

### Legal KB Ordinal-to-Digit Citation Normalization

- Identified: Batch 5 diagnostic sample (2026-08-14) — see the "Legal KB
  Answer Generation — Residual Citation-Rejection Causes" entry above for
  the original finding.
- Classification: Real, provably-safe normalization gap — same category as
  the whitespace-before-punctuation and alef-hamza fixes, not a new kind of
  fix. A prompt-instruction-only attempt (Batch 5) was tried first and
  measurably failed: the model converted spelled-out Arabic ordinals
  (اولا/ثانيا/ثالثا/رابعا/خامسا) to digits (1/2/3/4/5) identically on
  repeated attempts, before and after the instruction was added.
- Status: **Resolved (2026-08-15).**
- Fix: `citations.ts`'s `normalize()` gained a fixed, curated equivalence
  table for the first ten Arabic spelled-out ordinals (اولا through عاشرا,
  1 through 10) — legal enumerated lists in this corpus essentially never
  go beyond ten items. Applied one-directionally (ordinal word → digit)
  during normalization, so the stored source text (which uses the
  spelled-out form) and the model's excerpt (whichever form it happens to
  use) end up compared in the same canonical digit form. Matched with
  Arabic-letter lookaround (not `\b`, which never fires around Arabic in
  JS regex) to avoid matching a substring of some unrelated longer word.
- Verification: 3 new unit tests in `citations.test.ts` — accepts an
  excerpt using the real Code of Obligations and Contracts Article 177
  5-item list converted to digits; accepts a mid-list ordinal converted in
  isolation; and, the regression case that must never break, still rejects
  a fabricated excerpt that reuses a real digit/ordinal token attached to
  the wrong list item's content. Live re-verified, 2/2, against the real
  pipeline with the real question ("ما هي شروط صحة الرضى في العقد؟"): the
  model still converts the ordinals to digits exactly as before (unchanged
  model behavior — this was never a model-behavior fix), but the citation
  now passes because both sides normalize to the same form. Full
  regression: shared 96/96 (was 93/93), Legal KB golden set 9/9 including
  the now-fixed case 025 (`fixtures/legal-kb/025-ordinal-normalization.ts`,
  renamed from its former known-issue name and reclassified from
  `scoreLegalKbKnownIssueStillReproduces` to the ordinary
  `scoreLegalKbGrounding` bar used by case 021).
- **Not resolved by the same approach**: the ellipsis/elision splicing
  pattern (case 026) — see the Residual Causes entry above for why a second
  fix attempt there also failed and was not chased further.

### Legal KB Direct Article Lookup — Model Declines Despite an Exact Guaranteed-Inclusion Match

- Identified: Batch 6 golden-set case design (2026-08-14), building cases
  022/029 for `LEGAL_KB_GOLDEN_SET`.
- Classification: Real, narrow, code-fixable gap — not open-ended
  prompt-quality risk. Initially suspected to be in the same family as the
  Batch 5 residual causes (model-behavior variance not safely fixable),
  but a live diagnostic pass (not assumed) found and confirmed an actual
  mechanism, then fixed it.
- Status: **Resolved (2026-08-14).**
- Root cause: `RetrievedChunk`/`formatSourceBlocks()` never told the model
  which article number a SOURCE block actually was — only `id` and
  `heading`. A chunk's article number lives only in `LegalChunk.
  articleNumber` (DB metadata); when the chunk's own text doesn't happen
  to restate "Article N" inline, the model had no citable basis to
  attribute a claim to that article. Combined with the prompt's own
  (correct, deliberate) rule that every claim must be attributed to a
  specific article, the model correctly, conservatively declined rather
  than guess the chunk-to-number mapping — even holding the exact right
  content at guaranteed-inclusion priority (`score: Infinity`, chunk 0 of
  8, independently confirmed via `searchLegalKbChunks()`).
- How this was isolated, not assumed: two competing theories were tested
  live and ruled out before the real cause was found. (1) Anchoring on the
  prompt's own worked decline example ("The indexed legal texts do not
  address this question.", echoed verbatim) — removing the example
  entirely changed the decline's wording but not the outcome; ruled out.
  (2) Distraction from surrounding irrelevant chunks — stripping the
  context down to *only* the correct chunk, zero noise, still declined;
  ruled out. Adding an explicit `article=N` attribute to the SOURCE tag,
  sourced from the real `article_number` column, fixed both cases in both
  single-chunk and full 8-chunk contexts — 4/4.
- Fix: `search.ts`'s three Legal KB queries (vector leg, full-text leg,
  direct article-number lookup) now select `article_number`;
  `RetrievedChunk` carries it as `articleNumber?: string | null`, present
  only for Legal KB rows (Contract/Organization Brain candidate rows never
  select the column, so the field is genuinely absent — not
  present-but-null — on their chunks, proven by a dedicated test).
  `formatSourceBlocks()` (now exported for direct unit testing, like
  `buildMessages()`) emits ` article=N` on the tag when present, omits it
  entirely otherwise. `legal-kb-ask/v1.md` gained one line telling the
  model that tag is the authoritative article number and may be cited
  directly without needing to find it in the body text too.
- Live re-verification, both cases, all four configurations from the
  diagnosis, through the committed code (not a scratch prompt variant):
  full pipeline (`answerLegalKbQuestion()`, real 8-chunk context) and
  single-chunk isolation, both grounded and correctly attributed —
  `articleNumber: "52"` / `"94"` on the returned source, `confidence:
  95–100`. Full `LEGAL_KB_GOLDEN_SET` re-run: **9/9**, including the 7
  cases that already passed before this fix (Article 654 and the rest
  unaffected) — no regression. Contract/Organization Brain's existing
  test suites (unaffected by construction, since `articleNumber` is never
  populated for their chunks) re-run clean: 93/93 shared, 258/258 api,
  39/39 workers.

### Legal KB Qualified-Legal-Reviewer Requirement — Scope Clarification (No Production Deployment)

- Identified: Post-Batch-6 scope discussion (2026-08-14).
- Classification: Documentation/status clarification, not an engineering
  change. Does not touch, weaken, or waive any gating code.
- Status: **Resolved (2026-08-14) — clarified as out of scope, not waived.**
- Context: Every batch in this phase (Section 11's engineering-vs-legal-
  reviewer table; the "Lebanese Legal Knowledge Base — Phase 6 Domain
  Review" entry above; `PHASE6_IMPLEMENTATION_PLAN.md`'s Risks section) has
  correctly and consistently flagged that a qualified legal reviewer is
  needed before this system's content or answers could be trusted by real
  users, and that no such reviewer exists yet. That remains true and
  unchanged as a general statement about the system.
- Clarification: this project has no real production deployment planned —
  it is an educational/portfolio build, not a system serving real users.
  The qualified-legal-reviewer requirement exists specifically to protect
  real users from unreviewed legal content reaching them; that risk cannot
  occur if there are no real users. The requirement is therefore genuinely
  **out of scope** for this project as currently scoped — not satisfied,
  not skipped under pressure, and not silently dropped. If this project's
  scope ever changes to include a real deployment with real users, the
  requirement (and the genuine need for a real legal reviewer at that
  point) applies again exactly as designed, with nothing to re-derive.
- Explicitly unchanged by this clarification: `LEGAL_KB_LICENSE_MODE`'s
  fail-closed default, `DEVELOPMENT_ONLY` status on all five sources, and
  the production-clearances registry guard all remain exactly as built.
  None of that was contingent on this project having (or not having) real
  users — it demonstrates a correct engineering pattern for the gate
  regardless of current deployment plans, and stays in place unmodified.

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

### AI Assistant — Phase 7 Implementation

- Identified: This session (2026-08-19), following on directly from
  diagnosing why an earlier "Legal Assistant" chat UI
  (`LegalAssistant.tsx`, commit `66621b9`, PR #48, tagged `phase6`) was
  actually unreviewed Phase 7-shaped scope creep — a thin tab-switcher over
  the pre-existing Organization Brain and Legal KB `/ask` endpoints, with
  no planner, no tool selection, and no Domain Review entry recording it.
- Classification: Required for correctness — closing out the
  documentation gap that finding itself surfaced (`AI_ROADMAP.md`'s Phase
  7 row read "not started" while Phase-7-shaped code already existed in
  `develop`), and recording what was actually built this time, through the
  process the earlier attempt skipped.
- Status: **Implemented** (2026-08-19). Full detail in `AI_ROADMAP.md`
  Section 11; this entry records the outcome and the domain decisions
  actually made along the way, not the design itself.
- Decisions made during implementation (in batch order):
  1. **Five tools, closed set** (`searchContracts`, `getContractAnalysis`,
     `askContractQuestion`, `searchOrganizationBrain`,
     `searchLegalKnowledge`) — enforced structurally via the planner's own
     discriminated-union output schema, not by convention. No sixth tool,
     no raw-SQL escape hatch, no `organizationId` argument on any of the
     five.
  2. **Plan-and-Execute, not ReAct** — one planner call producing a capped
     plan (`ASSISTANT_MAX_PLAN_STEPS = 5`, an explicit MVP choice; no
     specific number was frozen in `AI_ARCHITECTURE.md` Section 7, so this
     was decided and documented rather than left implicit), executed in
     one parallel round with per-step failure isolation. Multi-hop
     chaining across rounds explicitly deferred, matching Section 7's
     already-documented, accepted limitation.
  3. **Evidence, not chunks, is the aggregation unit** — each tool's
     result is reshaped into one or more `AssistantEvidenceUnit`s (id,
     capability, label, content, optional contractId/confidence) rather
     than flattened into a single string, so the final answer can
     distinguish which Clausio capability grounded which claim.
  4. **Citations verified by existence, not by re-deriving excerpt
     verification** — the synthesis step cites evidence only by id
     (never re-transcribing an excerpt), checked against what it was
     actually given (`verifyEvidenceReferences`), additive to — not a
     duplicate of — each underlying tool's own already-run
     `verifyCitations()`.
  5. **Response DTO deliberately flatter than the internal `AssistantSource`
     type** — drops the tool name and any `toolsUsed`/`toolsFailed` list
     from what the frontend receives; which capabilities ran or failed is
     communicated in the answer's own prose instead, per "do not expose
     internal tool execution details unnecessarily."
  6. **Golden-set evaluation, not a second framework** — extended
     `packages/shared/ai/evaluation/` with an `AssistantGoldenExample` type
     and `runAssistantGoldenSet()`, judged at three tiers (planner tool
     selection, synthesis groundedness/robustness against a fixed
     evidence context, full pipeline against fake tool implementations —
     fake because `packages/shared` has no dependency on `packages/api`,
     where the real ones live). A live run of this suite found and fixed a
     real prompt-injection vulnerability in `assistant-synthesis/v1.md`
     (evidence content could override the model's own instructions);
     re-verified passing across two independent live runs after the fix.
- Not built, explicitly deferred (not silently missing): multi-hop tool
  chaining beyond one round, any write/mutation tool, persisted
  server-side conversation history. See `AI_ROADMAP.md` Section 11 for the
  full list and reasoning.
- Housekeeping done alongside this entry: `AI_ROADMAP.md`'s Phase Status
  table also had a second, unrelated stale entry corrected in the same
  pass — Phase 6's row still read "Batch 1 pending" despite Section 6 of
  the same document already stating "Batches 1–6 are complete" since
  2026-08-14. Corrected to match; not a new decision, just the table
  catching up to what the document's own body already said.

### AI_ANALYSIS_COMPLETED PERSONAL Notifications Can Only Ever Mean "You Uploaded This"

- Identified: Persisted per-user Notifications backend (2026-08-20).
- Classification: Pre-existing domain-model limit, not a bug in this feature.
- Status: Open, not built.
- Notes: `notificationService.createForAnalysisCompleted` resolves the
  PERSONAL-scope recipient as `Contract.uploadedByUserId` — there's no
  reviewer/assignee/watcher concept anywhere in the schema, so "for you" on
  an AI analysis notification can only ever mean "you're the uploader."
  Revisit once (if) a real assignment/reviewer concept exists on `Contract`;
  don't bolt a second recipient path onto notifications ahead of that.

### `AuditLog.contractId`'s `onDelete: SetNull` Is Unreachable — `audit_logs` Is Append-Only by DB Trigger

- Identified: Persisted per-user Notifications backend, while writing a
  verification script that hard-deleted a test `Contract` (2026-08-20).
- Classification: Real schema/DB inconsistency, discovered incidentally —
  not caused by, or specific to, the Notifications feature.
- Status: Open, not fixed.
- Notes: `schema.prisma` declares `AuditLog.contract` as
  `onDelete: SetNull`, but the DB has `audit_logs_no_update` /
  `audit_logs_no_delete` triggers (`reject_audit_log_mutation()`) enforcing
  true append-only immutability — confirmed directly:
  `prisma.contract.delete()` on a contract with any audit history throws
  Postgres error `P0001 audit_logs is append-only: UPDATE is not
  permitted`, because the FK's SET NULL action is itself an UPDATE to
  `audit_logs`. In practice this is harmless today — real application code
  never hard-deletes a `Contract`, only sets `deletedAt` — but the schema
  declares FK behavior the DB can never actually perform for any contract
  with ≥1 audit log row (i.e. almost every real contract). Worth a Domain
  Review pass to either document this as intentional (hard-delete is simply
  not supported once audited) or change the declared `onDelete` behavior to
  match reality.

### `OrganizationSettings.notificationPreferences` Shape Mismatch Between Seed Data and the Live Settings Feature

- Identified: Persisted per-user Notifications backend, while seeding test
  data for verification (2026-08-20).
- Classification: Stale seed fixture, not an application bug.
- Status: Open, not fixed.
- Notes: The seeded Ridgeline Voss org's `notification_preferences` JSON is
  `{"emailDigestEnabled": true, "expiryAlertDaysBefore": 30}` — but
  `NotificationSettings.tsx` / `settings.service.ts` / `settings.schemas.ts`
  read and write a completely different shape:
  `{contractUpdates, riskAlerts, aiInsights}`. Doesn't break anything today
  (both this feature's and the settings UI's preference reads treat unknown
  keys as "unset," which defaults to enabled/false respectively rather than
  erroring), but `packages/shared/prisma/seed.ts` should be updated to match
  the current settings shape so a fresh seed reflects real app behavior.

### `pdfjs-dist` Missing From Installed `node_modules` Despite Being a Declared `packages/workers` Dependency

- Identified: Persisted per-user Notifications backend, while typechecking
  `packages/workers` for the new sweep job (2026-08-20).
- Classification: Environment/install drift, not caused by this feature.
- Status: Open, not fixed.
- Notes: `packages/workers/package.json` declares `"pdfjs-dist": "^6.2.108"`,
  but it's absent from `node_modules` entirely (not just missing types) in
  this checkout. `npx tsc --project tsconfig.build.json` and `npm run build`
  both fail on `src/lib/text-extraction.ts` with `Cannot find module
  'pdfjs-dist/...'`. Because `packages/workers/src/queues/index.ts` wires up
  every job (including extraction) into one `createWorkers()` call, this
  would also break booting the entire worker fleet at runtime, not just the
  extraction path specifically — worth an `npm install` / lockfile check
  before anyone next needs a full `npm run dev`/`build` in `packages/workers`.

### `DropdownMenuTrigger`'s `Button` Ref Isn't Forwarded — Breaks Floating-UI Anchor Positioning (at least in headless Chromium)

- Identified: Notifications frontend pass, while browser-verifying the new
  grouped bell dropdown (2026-08-20).
- Classification: Pre-existing, systemic — not introduced by, or specific
  to, the notifications feature.
- Status: **Fixed** (2026-08-20). Confirmed not just cosmetic: in real
  (non-headless-quirk) usage, the user reported the notifications dropdown
  opening and then immediately closing itself on click — floating-ui's
  outside-press dismiss logic couldn't recognize the trigger's own DOM node
  as "inside" the anchor without a forwarded ref, so it treated the click
  that opened the menu as an outside click and closed it again. Fixed by
  wrapping `Button` in `React.forwardRef` in `components/ui/button.tsx` and
  threading the ref into `useRender`'s dedicated `ref` parameter (not
  `mergeProps`, which is for DOM props only). Verified via computed styles
  that the resulting `data-active` attribute-based variants (see the tabs.tsx
  entry below) and dropdown open/close behavior both now work correctly in
  a real browser session, not just DOM-level assertions.

### `components/ui/tabs.tsx` Used Tailwind v4 Variant Syntax in a Tailwind v3 Project — Active-Tab Styling Never Rendered

- Identified: Notifications frontend pass, while restyling the "View all"
  modal's tabs to an underline style (2026-08-20).
- Classification: Pre-existing, systemic — not introduced by, or specific
  to, the notifications feature. Affects every consumer of `Tabs`
  (`ContractInsights.tsx` as well as the new notifications modal).
- Status: **Fixed** (2026-08-20).
- Notes: `tabs.tsx` used bare `data-active:...` classes throughout (e.g.
  `data-active:bg-background data-active:text-foreground`, plus several
  chained after `group-data-[variant=...]:`). Bare `data-*` variants without
  bracket syntax are a Tailwind v4 feature; this project runs
  `"tailwindcss": "^3.4.0"` (`packages/web/package.json`), where
  `data-active:` isn't a recognized variant at all and Tailwind's JIT
  silently generates no CSS for it — not a build error, just dead classes.
  Confirmed via `getComputedStyle` in a live browser: the active tab
  (base-ui correctly sets `data-active=""` on it — verified via
  `outerHTML`) rendered with the exact same text color as the inactive tab,
  and the "line" variant's underline pseudo-element stayed at `opacity: 0`
  even when active. Fixed by replacing all 11 occurrences of `data-active:`
  with `data-[active]:` (valid Tailwind v3 attribute-selector syntax) in
  `components/ui/tabs.tsx`. Not independently reproduced on
  `ContractInsights.tsx`'s tabs (time-boxed), but the same broken class
  names are present there too, so its active/selected tab background
  almost certainly has the identical rendering bug.

### `aiAnalysisRepository.create()` in `packages/api` Is Dead Code — the Real Async Pipeline Never Called It

- Identified: Notifications settings-gap pass, while wiring a new
  `RISK_FLAG_DETECTED` notification and checking whether the existing
  `AI_ANALYSIS_COMPLETED` hook (added in an earlier pass of this same
  feature) actually fires for real analysis completions (2026-08-20).
- Classification: Real, significant functional bug — not something this
  feature introduced, but this feature's own earlier work was built on top
  of it without noticing. Fixed as part of this pass; flagging the
  underlying dead code for a separate cleanup decision.
- Status: Partially fixed — see notes.
- Notes: The real BullMQ AI-analysis pipeline
  (`packages/workers/src/jobs/ai-analysis.job.ts`) calls
  `markAnalysisCompleted` from `packages/workers/src/repositories/
  ai-analysis.repository.ts`. There is a *separate*, similarly-named
  `create()` function in `packages/api/src/repositories/
  ai-analysis.repository.ts` — a different file in a different package —
  which is where the `AI_ANALYSIS_COMPLETED` notification hook was
  originally added. Grepping the whole `packages/api` tree for
  `aiAnalysisRepository.create(` turns up zero call sites: nothing in
  `ai-analysis.service.ts` or anywhere else ever invokes it. This means
  `AI_ANALYSIS_COMPLETED` notifications have never actually fired for a
  real, queue-processed analysis completion — only for the earlier
  verification passes' direct calls into the service function, which
  bypassed the (missing) real integration entirely and made the feature
  look correct when it wasn't reachable in production. Fixed in this pass
  by moving the equivalent notification-creation logic (org gate, ACTIVE
  check, personal gate) directly into
  `packages/workers/src/repositories/ai-analysis.repository.ts`'s
  `markAnalysisCompleted`, matching the pattern already used there for the
  new `RISK_FLAG_DETECTED` hook and for the sweep job — workers-side
  notification creation is inlined with `@starter-kit/shared`'s preference
  helpers rather than importing `packages/api`'s service, since no such
  cross-package dependency exists today. The dead `create()` function and
  its now-redundant notification call in `packages/api` were left in place
  rather than deleted — it's plausible it was meant for a future
  synchronous/manual re-analysis endpoint that hasn't been wired up yet,
  and deleting an unused-but-possibly-intentional public repository method
  felt like a bigger call than this pass's scope. Worth a deliberate
  decision: either wire something real to it or remove it.

### `ContractInsights.tsx` Has No URL Param to Pre-Select a Tab — Risk-Flag Notifications Can't Deep-Link to the Risk Tab

- Identified: Notifications settings-gap pass, while deciding where
  `RISK_FLAG_DETECTED` notifications should navigate to (2026-08-20).
- Classification: Minor, pre-existing limitation — not introduced by this
  feature.
- Status: Open, not fixed.
- Notes: `ContractInsights.tsx`'s `Tabs` uses local `defaultValue="summary"`
  state with no URL/query-param wiring, so there's no way to link directly
  to its "risk" tab from outside the component. `RISK_FLAG_DETECTED`
  notifications currently route to the same `/contracts/:id/analysis`
  destination as `AI_ANALYSIS_COMPLETED` (landing on the Summary tab by
  default) rather than jumping straight to the flagged risk. Small,
  contained fix if wanted: read an initial-tab query param in
  `ContractInsights.tsx` and have `toNotificationDisplay`'s
  `RISK_FLAG_DETECTED` case append it to the route.

### `Sidebar.tsx` Hardcodes "Administrator" as the User's Role Label Regardless of Actual Role

- Identified: Notifications settings-gap pass, while browser-verifying the
  new personal risk-flag toggle as Priya Nair — seeded as `INTERNAL` role,
  not `ADMIN` (2026-08-20).
- Classification: Pre-existing, unrelated UI bug — not introduced by, or
  specific to, the notifications feature. Found incidentally.
- Status: Open, not fixed.
- Notes: `components/layout/Sidebar.tsx:184` and `:193` render the literal
  string `"Administrator"` under the signed-in user's name and in the
  tooltip/label ("Signed in as Administrator"), unconditionally — not
  derived from `user.role` at all. Confirmed live: Priya Nair (seeded as
  `INTERNAL`, per `seed.ts`'s "Internal (Legal)" comment) is shown as
  "Administrator" in the sidebar despite her org-settings permission check
  (`isAdminRole`, used correctly elsewhere e.g. `adminNav` filtering on
  line 86 of the same file) correctly returning `false` for her — visible
  as the Workspace notifications toggles rendering disabled/dimmed for her
  even though the sidebar claims she's an Administrator. Cosmetic only
  (doesn't affect actual permission enforcement, which reads `user.role`
  correctly elsewhere), but misleading. Fix would be a small, contained
  change: derive the displayed label from `user.role` (e.g. via a
  role-label map) instead of the hardcoded string.
