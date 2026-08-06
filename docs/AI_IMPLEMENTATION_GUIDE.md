# Clausio AI Implementation Guide

**This is not an architecture document.** `AI_ARCHITECTURE.md` is the frozen
architecture and remains the single source of truth for *why* the system is
shaped the way it is. This document is the execution handbook: what is
already built, what each remaining phase is responsible for, who owns which
files, and how to know when a phase is done — so that a developer or an AI
coding assistant can start implementation work without needing a new
architecture discussion first.

If anything here appears to conflict with `AI_ARCHITECTURE.md`, the
architecture document wins. Stop and flag the conflict rather than resolving
it unilaterally — same rule the architecture document itself states in its
"Architecture Freeze" section.

## How to use this document

Someone — human or AI assistant — should be able to say "Start Phase 3" and
proceed correctly. Each phase section below ends with an **"Instructions for
Claude Code / Codex"** subsection written for exactly that situation: what to
read first, what already exists, what's in scope, what files are expected,
what must not change, when to stop and ask instead of guessing, and how to
verify the phase is actually done.

---

## Current State: Phase 1 (AI Foundation) — ✅ Complete

Phase 1 built the shared infrastructure every later phase runs on top of. It
is fully implemented, built, and verified against real OpenRouter calls and
a real database — not mocked. Treat everything below as **reusable
infrastructure, not a reference implementation to copy** — later phases
extend it by adding new prompts, schemas, and registry entries, not by
reimplementing any part of it.

| Layer | Location | What it does |
|---|---|---|
| Provider layer | `packages/shared/ai/providers/` | `getCompletion()` — the single choke point every AI call passes through. Talks to OpenRouter, times the call, logs an `AiCallLog` row automatically (success or failure), classifies failures via `AiProviderError` (`retryable: boolean`). |
| Prompt system | `packages/shared/ai/prompts/` | Prompts are versioned `.md` files, one per version, never mutated once used (`prompts/<id>/v1.md`, `v2.md`, ...). `loadPrompt(id, version)` reads a specific version. |
| Prompt & schema registry | `packages/shared/ai/registry/` | `resolvePrompt(id)` / `resolveSchema(id)` — the single place that knows which version is "active" right now. Rollback is a one-line pointer change. |
| Schema validation | `packages/shared/ai/schemas/` | `getValidatedCompletion(request, schema)` — calls the provider, parses/validates the JSON response against a Zod schema, and corrects the `AiCallLog` row to `VALIDATION_FAILED` in place if it fails. Throws `AiValidationError` (always terminal) on failure. |
| Context optimization seam | `packages/shared/ai/context.ts` | `optimizeContext(gathered)` — an identity function today. Not a pluggable strategy layer; do not turn it into one until a second real implementation justifies it. |
| Evaluation framework | `packages/shared/ai/evaluation/` | `runGoldenSet(organizationId)` + `npm run eval --workspace=@starter-kit/shared` — scores a set of known examples against expected output. Currently contains one placeholder example, not a real golden set. |
| Worker orchestration | `packages/workers/src/jobs/ai-analysis.job.ts` + `packages/workers/src/repositories/ai-analysis.repository.ts` | `processAIAnalysisJob` — generic BullMQ job: resolves a prompt/schema pair, calls `getValidatedCompletion`, persists the outcome. Mirrors `extraction.job.ts`'s retryable-vs-terminal shape exactly. Nothing enqueues this job automatically yet. |
| `AIAnalysis` API | `packages/api/src/{repositories,services,controllers,routes}/ai-analysis.*` | Read-only today: `GET /contracts/:id/analyses`, `GET /contracts/:id/analyses/:analysisId`. Org-scoped through the `Contract` relation. No create/trigger route exists yet — deliberately left to Phase 2. |
| Observability | `AiCallLog` model (`ai_call_logs` table) | Every provider-layer call is logged automatically: model, prompt/schema id+version, tokens in/out, latency, status (`SUCCESS` / `VALIDATION_FAILED` / `PROVIDER_ERROR`). |
| Database | `AIAnalysis` model | Already had `promptUsed`, `result`, `modelVersion`, `tokensUsed`. Phase 1 added `promptVersion` and `schemaVersion` — this gap from the original schema is closed. |

**What exists only as scaffolding, not real content:** `prompts/test/v1.md`,
`schemas/test/v1.ts`, and the single placeholder golden-set example. These
proved the mechanism works end-to-end (see Batch 8's capstone test — one
call through registry → prompt → schema → provider → validation → worker
repository → `Contract.processingStatus` → audit log). They are not a
template to copy for real content, and not something later phases need to
delete — just don't build on them as if they were real.

---

## Frozen — Do Not Modify Without Discussion

These are mechanisms, not content. Extending the platform means adding new
prompt files, new schema files, and new registry entries — never changing
how these mechanisms themselves work:

- `packages/shared/ai/providers/` — the provider abstraction itself (add a
  new provider adapter only if/when a second provider is actually needed;
  see `AI_ARCHITECTURE.md` Section 3.1).
- The prompt/schema **versioning convention** (file-per-version, registry as
  the only active-version pointer) — Section 10/11.
- The `getValidatedCompletion` / `AiCallLog` status-correction mechanism
  (`SUCCESS` → `VALIDATION_FAILED` in place).
- The BullMQ job retryable-vs-terminal pattern itself (the *shape*, not the
  specific jobs built on it).
- `packages/shared/queue/` conventions (queue naming, default job options).
- Multi-tenancy, authentication, authorization — out of scope for any AI
  phase per `CLAUDE.md`'s Architecture Rules.

If a phase seems to require changing one of these, that's the signal to stop
and discuss — per `AI_ARCHITECTURE.md`'s Architecture Freeze — not a signal
to route around it.

---

## Phase 2 — AI Analysis Engine

### Purpose

Replace Phase 1's placeholder prompt/schema with the real thing: actual
`SUMMARY` and `RISK` analysis of real contracts, triggered automatically
after extraction, producing real structured, persisted `AIAnalysis` rows.

### Responsibilities

- Real, versioned prompts and schemas for `SUMMARY` and `RISK`.
- Wiring the automatic trigger: today, nothing enqueues `aiAnalysisQueue`
  when a contract reaches `EXTRACTION_COMPLETED` — Phase 2 must add this.
  Section 5 requires it to be both automatic by default *and*
  re-triggerable manually.
- A manual re-trigger endpoint (deliberately not built in Phase 1).
- Per Section 16: Red Flag Detection, Contract Health Score, and
  Timeline/Obligation extraction are **views over the structured `RISK`
  result**, not independent AI calls or separate prompts. The `RISK` schema
  needs to be rich enough (severity, obligations, dates, flags) for these
  views to be derived from one persisted result — don't build them as
  separate analysis types.
- Real golden dataset entries (Section 12 — starts in parallel with this
  phase, requires legal judgment to verify correctness, not just engineering
  judgment; start with 10–20 real, anonymized contracts).

### Flag before starting, don't resolve unilaterally

`AIAnalysisType` already has a `CLAUSE_QUERY` value in the Prisma enum, but
Section 16's Phase 2 scope list does **not** mention clause querying — that
capability is described separately, as Clause Investigator's retrieve-then-
generate pipeline (Section 6, Phase 3), which is architecturally a different
shape (RAG, not single-shot structured extraction). Whether `CLAUSE_QUERY`
as an `AIAnalysisType` is: (a) meant for a different use than what its name
suggests, (b) redundant with Phase 3's Investigator, or (c) something to
formally deprecate — is unresolved. Raise it, don't silently pick one.

### Deliverables

- `packages/shared/ai/prompts/summary/v1.md`, `packages/shared/ai/prompts/risk/v1.md`
- `packages/shared/ai/schemas/summary/v1.ts`, `packages/shared/ai/schemas/risk/v1.ts`
- `ACTIVE_PROMPT_VERSIONS` / `ACTIVE_SCHEMA_VERSIONS` entries added in
  `packages/shared/ai/registry/index.ts` (extend the existing objects —
  don't restructure the registry mechanism itself)
- Trigger wiring (likely alongside `markExtractionCompleted` in
  `packages/workers/src/repositories/contract-processing.repository.ts`, or
  a follow-up step in `extraction.job.ts` — confirm the right seam rather
  than assuming)
- `packages/api`'s `ai-analysis.service.ts` / `.controller.ts` / routes
  extended with a create/trigger endpoint
- Real entries in `packages/shared/ai/evaluation/golden-set.ts`

### APIs involved

Extend, don't replace: `packages/api/src/{repositories,services,controllers,routes}/ai-analysis.*`
(Batch 7) and `packages/shared/ai/{providers,prompts,registry,schemas,evaluation}` (Phase 1).

### What should be stored

Real `AIAnalysis` rows via the existing repository/service layers — nothing
new needed there. Every row must carry `promptVersion` and `schemaVersion`
(already wired end-to-end since Batch 8's capstone test). Rows remain
immutable snapshots — re-analysis creates a new row, never updates an old
one (Section 2).

### What must NOT be implemented in Phase 2

- Clause Investigator retrieval, embeddings, or pgvector (Phase 3).
- Organization Brain ingestion or reasoning (Phase 4 / Near Future).
- AI Assistant / tool-calling / any agent orchestration (Section 7, Near
  Future — not MVP).
- Any change to the provider layer, registry mechanism, or schema-validation
  mechanism itself — only new prompt/schema *content*.
- Auto-regenerating existing `AIAnalysis` rows to match a new schema/prompt
  version — regeneration is always an explicit user/admin action (Section 11).

### Completion criteria

- Real `SUMMARY` and `RISK` prompts and schemas exist, versioned, and are
  the active registry entries.
- A contract reaching `EXTRACTION_COMPLETED` automatically enqueues real
  analysis; a manual re-trigger endpoint also works.
- Real `AIAnalysis` rows are created with real, schema-validated content;
  `promptVersion`/`schemaVersion`/`modelVersion`/`tokensUsed` are all populated.
- Red Flag / Health Score / Timeline / Obligation views are demonstrably
  derived from the persisted `RISK` result, not separate calls.
- `npm run eval --workspace=@starter-kit/shared` runs against real (not
  placeholder) golden-set examples for both `SUMMARY` and `RISK`, and passes.

### How to verify

1. `npm run build` on `@starter-kit/shared`, `@starter-kit/api`, and
   `@starter-kit/workers`.
2. Run a real contract through extraction → automatic analysis trigger →
   inspect the resulting `AIAnalysis` row and `AiCallLog` row directly.
3. Force a validation failure (e.g. temporarily point at a broken schema)
   and confirm `Contract.processingStatus` ends up `AI_FAILED` with a real
   `processingError`, same as Batch 8's capstone test proved for the
   placeholder case.
4. Run `npm run eval` and read the pass/fail output.

### Instructions for Claude Code / Codex — Phase 2

**Read first:** `AI_ARCHITECTURE.md` Sections 2, 5, 10, 11, 12, 16, 18;
`docs/DOMAIN_REVIEW_BACKLOG.md` (Contract Value and Risk are both already
flagged there as needing real schema design); this section above.

**What already exists:** the entire Phase 1 stack described above — provider
layer, prompt/schema/registry mechanism, worker job processor, `AIAnalysis`
read API, evaluation runner. Do not rebuild any of it.

**Your responsibility:** real prompt/schema content for `SUMMARY` and `RISK`,
the automatic trigger, a manual re-trigger endpoint, and real golden-set
entries.

**Files you own:** new files under `prompts/summary/`, `prompts/risk/`,
`schemas/summary/`, `schemas/risk/`; additions to `registry/index.ts` and
`evaluation/golden-set.ts`; extensions to `ai-analysis.service.ts` /
`.controller.ts` / routes in `packages/api`; the trigger wiring (location TBD
— confirm before implementing, don't assume).

**Do not touch:** anything in the "Frozen" section above, `prompts/test/`,
`schemas/test/` (leave as-is), the provider/registry/schema-validation
mechanisms themselves.

**Stop and ask if:** the exact fields for the `RISK` schema aren't obvious
from existing product docs (this needs legal/business judgment per Section
12 — a Domain Review, not an engineering guess); or the `CLAUSE_QUERY`
ambiguity above needs resolving before you can proceed.

**Verify completion using:** the four steps under "How to verify" above.

---

## Phase 3 — Clause Investigator

### Purpose

Build retrieval-augmented question-answering over a contract's own text
(`AI_ARCHITECTURE.md` Section 6): ask a question, get a grounded answer with
verifiable citations back to the actual contract text.

### Responsibilities

- **Chunking** — clause/section-aware, not fixed-size. Chunk boundaries
  matter for legal text and citation quality.
- **Embeddings** — reorganize the existing `generateEmbedding`/
  `generateEmbeddings` (currently in `packages/shared/ai/embeddings.ts`,
  using `client.ts`'s raw OpenAI client) under `providers/`, per
  `AI_ARCHITECTURE.md`'s own stated plan. This is a sanctioned reorg, not a
  violation of the "frozen provider layer" rule above.
- **pgvector storage** — org-scoped at the index/query level itself, never
  filtered only after retrieval (Section 14).
- **Hybrid retrieval** — vector similarity + Postgres full-text search
  (defined terms and exact legal phrases need keyword matching, not just
  semantic similarity).
- **Context Optimizer seam** — route retrieved chunks through the existing
  `optimizeContext()` (`packages/shared/ai/context.ts`) before the
  generation call. Still a no-op today; do not add real compression logic
  unless a measured cost/latency problem justifies it (Section 9).
- **Citation verification** — every claim in the answer must resolve to an
  actually-retrieved chunk. Reject/regenerate if a citation doesn't resolve.
  Never show a fabricated citation.
- **Retrieval API** — a new endpoint (or set of endpoints) for asking a
  question about a specific contract and getting an answer + sources back.

### Integration with AI Foundation

The final generation call goes through the existing provider layer
(`getCompletion` or `getValidatedCompletion`, whichever fits the output
shape). Log which chunks were retrieved on the observability row for
debugging — do **not** build full index-snapshotting for point-in-time
reproducibility; chat answers are advisory and transient, unlike an
`AIAnalysis` row (Section 6 is explicit that this is a deliberately accepted
gap, not an oversight).

### Explicitly NOT part of Phase 3

**Do not implement AI Assistant behavior.** Investigator is RAG — a fixed
pipeline (embed → retrieve → optimize context → generate) — not an agent
deciding what to do next. Per Section 3.1's three-layer model, Investigator
needs only the provider layer, never the tool or agent layers. If you find
yourself building a planner, a tool-calling loop, or anything that decides
which action to take next, stop — that's Section 7 (Near Future, not this
phase).

Also explicitly not in scope: Organization Brain or Legal Knowledge Base
indexing. The architecture is designed for three corpora sharing this same
retrieval engine (Section 3.2), but **Phase 3 MVP populates only the
Contracts corpus.**

### Completion criteria

- Contract text is chunked clause/section-aware and embedded.
- Embeddings are stored in `pgvector`, provably org-scoped at the query
  layer (not filtered after the fact).
- Hybrid retrieval (vector + full-text) is implemented and returns relevant
  chunks for a real test question.
- Citation verification rejects/regenerates on an unresolved citation —
  demonstrate this with a deliberately forced case, same discipline as every
  Phase 1 batch's verification.
- A real API endpoint answers a real question about a real contract with
  citations that resolve to actual retrieved text.
- Deleting a contract removes its embeddings — no orphaned vectors (Section 14).

### Instructions for Claude Code / Codex — Phase 3

**Read first:** `AI_ARCHITECTURE.md` Sections 3.1, 3.2, 6, 9, 14, 18; this section above.

**What already exists:** the provider layer, context optimizer seam,
`embeddings.ts` (to be reorganized, not rewritten from scratch), observability.

**Your responsibility:** chunking, embeddings reorg, pgvector storage,
hybrid retrieval, citation verification, the retrieval API.

**Files you own:** a new retrieval/chunking module under
`packages/shared/ai/` (name it clearly — this is a genuine addition to the
frozen folder list in Section 3.3; a reasonable choice is `retrieval/`, but
confirm this doesn't collide with anything before committing to a name), a
new pgvector-backed Prisma model (this is schema work — needs a Domain
Review per `CLAUDE.md` before migrating), and new `packages/api` repository/
service/controller/routes for the question-answering endpoint.

**Do not touch:** the provider layer's core mechanism, the AI Assistant
(doesn't exist yet — don't start it), Organization Brain or Legal Knowledge
Base indexing.

**Stop and ask if:** the pgvector schema design isn't obvious (new model,
new migration — Domain Review territory), or you find yourself reaching for
agent/tool-calling patterns to answer a question.

**Verify completion using:** the five criteria above, each demonstrated
against a real contract and a real question — not a mocked retrieval result.

---

## Phase 4 — Organization Brain (Ingestion Only)

### Purpose

Start the data-accumulation clock early: let an organization upload or paste
its own templates, policies, preferred clause language, and internal
guidelines, and store them. Per `AI_ARCHITECTURE.md` Section 2 and Section 8:
customer-specific data compounds in value over time, which is why ingestion
starts *before* anything reasons over it.

### Responsibilities

- Upload/paste flow for: templates, policies, preferred clauses, internal
  guidelines.
- Storage — **reuse** `packages/shared/storage/` (`uploadFile`,
  `downloadFile`, `getPresignedUrl` already exist and are used by Contract
  upload today). Do not build a second storage integration.
- Metadata: title, a category/type distinguishing template vs. policy vs.
  clause vs. guideline, organization ownership.
- Indexing — in the sense of "listable, searchable-by-metadata, organized,"
  **not** semantic/vector indexing. See explicit exclusion below.
- A new Prisma model for this corpus (does not exist today — Domain Review
  required before schema work per `CLAUDE.md`'s Domain Review Workflow).

### Explicitly NOT part of Phase 4

Per Section 8's MVP scope, this phase is **ingestion and storage only**:

- **No embeddings.** No vectorizing this content.
- **No retrieval.** Nothing queries this corpus yet.
- **No reasoning.** No AI call references this data.
- **No memory or learning.** No usage-pattern inference of any kind.

The corpus exists and grows; nothing consumes it in this phase. Retrieval
and reasoning over it is explicitly a "Near Future" extension (Section 8),
built once Phase 3's retrieval infrastructure is proven — not part of this
phase's completion criteria.

### Known, non-architectural gap worth surfacing

Unlike the Contracts corpus (auto-populated from every upload), this corpus
only grows if a customer manually contributes content. Section 8 names this
explicitly as an onboarding/product problem, not something this phase's
engineering work solves — worth flagging to whoever owns product/onboarding
once this phase ships, so the corpus doesn't sit empty by default.

### Completion criteria

- An org admin can upload or paste a template/policy/clause/guideline.
- It's stored (via the existing storage module), with metadata and clear
  organization ownership — org-scoped at the query layer, same as
  everywhere else in the system.
- It's listable, retrievable, and deletable via a real API.
- Deletion doesn't leave orphaned storage objects.
- **Nothing in this phase makes an AI call.** If any code path in this
  phase invokes the provider layer, that's out of scope — remove it.

### Instructions for Claude Code / Codex — Phase 4

**Read first:** `AI_ARCHITECTURE.md` Sections 2, 8, 14; `CLAUDE.md`'s
Domain Review Workflow; this section above.

**What already exists:** `packages/shared/storage/` (reuse directly), the
existing Contract upload flow as a reference pattern for
upload-endpoint-plus-metadata (not for AI — Contract's flow happens to
trigger extraction/analysis, this phase's flow must not).

**Your responsibility:** a new domain model, storage-backed upload/list/get/
delete API, all org-scoped, zero AI involvement.

**Files you own:** a new Prisma model + migration (Domain Review first), new
`packages/api` repository/service/controller/routes for this resource.

**Do not touch:** anything under `packages/shared/ai/` — this phase has no
AI component at all. If you find yourself importing from `providers/`,
`schemas/`, or `prompts/`, stop — that's out of scope for this phase.

**Stop and ask if:** the exact shape of the new model (single table with a
type/category column vs. separate tables per content type) isn't obvious —
that's a real Domain Review question, not an implementation detail.

**Verify completion using:** the five criteria above. The last one — zero AI
calls — is the one most worth explicitly checking, precisely because it's
the one most likely to be violated by accident (e.g., auto-tagging a
template's category with an LLM would be an easy, out-of-scope shortcut to
reach for).

---

## Dependencies

```
Phase 1 (AI Foundation) — done
   │
   ├──► Phase 2 (AI Analysis Engine)
   ├──► Phase 3 (Clause Investigator)
   └──► Phase 4 (Organization Brain — ingestion only)
              │
              ▼
   Phase 5 (AI Assistant — Near Future, not MVP)
   depends on Phase 2 + Phase 3 being complete
   (Phase 4's ingestion enriches it later, but isn't
   a hard blocker for Assistant's core MVP)
```

**Why Phases 2, 3, and 4 can run in parallel:** each owns a disjoint set of
files and a disjoint set of database models, and each builds *on top of*
Phase 1's frozen mechanism without needing to modify it:

- Phase 2 touches `AIAnalysis` (already exists) plus new prompt/schema files.
- Phase 3 touches new pgvector-backed models plus a new retrieval module.
- Phase 4 touches an entirely new model with zero AI involvement.

None of them need to change the provider layer, the registry mechanism, the
schema-validation mechanism, or each other's files. The only thing they
share is Phase 1's infrastructure, which is frozen and read-only from their
perspective — extended via new content (prompts, schemas, registry entries),
never modified as a mechanism.

Phase 5 (AI Assistant) is listed for completeness — it is **Near Future, not
MVP** (Section 7/17). Its planner needs to orchestrate calls into both
Analysis (Phase 2) and Investigator (Phase 3) as tools, so it structurally
cannot start before both are done. It is not part of the current
parallelizable work.

---

## Development Rules

Every phase follows the same rules — this is the short version;
`AI_ARCHITECTURE.md` Section 18 has the exhaustive "Always/Never" list:

- **Reuse the AI Foundation.** Check `packages/shared/ai/` for an existing
  provider, prompt, schema, or mechanism before writing a new one.
- **Never bypass shared abstractions.** Every LLM call goes through the
  provider layer. Every structured output gets validated against a Zod
  schema before persisting. No exceptions for "just this once."
- **Do not redesign architecture.** If a task seems to require changing how
  the provider layer, registry, or schema validation *works* (not just what
  content flows through them), stop and raise it — don't route around it.
- **Keep commits small, keep PRs reviewable.** One phase's worth of work is
  still expected to land as multiple focused batches, same discipline as
  Phase 1.
- **Validate using real data whenever possible.** Every Phase 1 batch was
  verified against a real OpenRouter call and a real database, not mocks —
  hold later phases to the same bar.
- **Extend existing interfaces rather than replacing them.** A new analysis
  type is a new prompt + schema + registry entry, not a parallel pathway
  that skips any part of the stack.

---

*After completing any phase, update the "Current State" section above
before starting the next one — this document should always reflect what's
actually true, not what was true when it was written.*
