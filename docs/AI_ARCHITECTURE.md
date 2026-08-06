# Clausio AI Architecture

Status: **Frozen.** This document defines the official AI architecture of
Clausio, in the same sense that `Clausio_Deployment_Architecture.md` is
authoritative for infrastructure. It is the single source of truth for how
Clausio's AI platform is designed, what belongs to the current
implementation scope, what is intentionally postponed, and how every future
AI capability is expected to fit into what exists today. Implementation
work extends this architecture; it does not redesign it. See
**Architecture Freeze** at the end of this document for what that means in
practice.

This document assumes no prior context. A developer — human or AI coding
assistant — should be able to read it once and understand the whole AI
system without needing the design conversations that produced it.

---

## 1. Vision

Clausio's product vision (`PRODUCT_VISION.md`) already states the goal
plainly: AI-assisted contract understanding and structured extraction of
contract knowledge are core to the product, not a bolt-on feature.

This document exists because of a deliberate framing decision made before
any AI code was written: **Clausio is building an AI platform, not a
collection of AI features.** Every capability described below — including
ones not yet implemented — is expected to be built as an extension of a
shared set of layers (provider access, prompt management, structured
output validation, evaluation, observability), not as an independent,
bespoke integration. The cost of getting this wrong is an unmaintainable
sprawl of one-off LLM calls with no consistent versioning, no way to
evaluate quality over time, and no single place to reason about cost or
security. The architecture below exists specifically to prevent that.

---

## 2. Guiding Principles

These are the conclusions the architecture is built on. They are not
aspirational — they should change how you make decisions when this
document doesn't explicitly answer a question.

- **AI should perform work, not only answer questions.** Displaying an
  analysis is table stakes. Drafting the renewal notice, not just flagging
  the renewal date, is where real product value lives.
- **Organization Brain is Clausio's long-term moat.** Features built on
  generic AI reasoning (summarization, risk flagging) are replicable by any
  competitor with a model API key. Features built on a specific customer's
  accumulated data are not.
- **Customer-specific knowledge compounds over time.** The value of
  Organization Brain grows with time-in-use, which is why ingestion starts
  earlier than the reasoning that will eventually use it (see Phase 4).
- **Explainability is more important than impressive responses.** A legal
  product's AI output is worthless if a lawyer can't verify why it said
  what it said. Every AI-derived claim should be traceable to its source.
- **AI outputs must be grounded and verifiable.** Extraction and retrieval
  results must be checkable against the source text, not trusted on the
  model's word.
- **Prompt engineering without evaluation is unsustainable.** A prompt
  change with no way to measure whether it helped or hurt is not an
  improvement, it's a guess.
- **AI analyses are immutable snapshots.** An `AIAnalysis` row, once
  written, is never edited or overwritten by a later schema or prompt
  change.
- **Reanalysis creates a new version rather than modifying history.**
  Re-running analysis on a contract produces a new `AIAnalysis` row; it
  never mutates the old one.
- **Prompts are versioned assets.** A prompt is content with a history,
  not a string embedded in application logic.
- **Schemas evolve without migrating historical analyses.** New schema
  versions are additive where possible; old records are read through
  version-aware logic, never rewritten.
- **Human approval is required for AI-generated external actions.**
  Nothing the AI drafts that could leave the organization (a notice, a
  counter-clause, an email) sends without an explicit human approval step.
- **Future capabilities should extend the AI Platform instead of
  bypassing it.** A new capability that talks to an LLM provider directly,
  skips schema validation, or skips observability logging is an
  architecture violation, not a shortcut.

---

## 3. Architecture Overview

### 3.1 Three layers, not one

The most important structural decision in this document: LLM access,
tool/function calling, and agent orchestration are **three distinct
layers**, not interchangeable design choices. Conflating them was the
single biggest risk identified while designing this system.

```
┌─────────────────────────────────────────────────────────┐
│  Agent layer                                              │
│  Decides which tools to call, in what order, to answer a  │
│  request. Only the AI Assistant needs this layer.         │
└───────────────────────────┬─────────────────────────────┘
                              │ calls
┌───────────────────────────▼─────────────────────────────┐
│  Tool layer                                                │
│  Typed, parameterized, org-scoped functions independent of│
│  which model calls them. Never raw SQL generated by an LLM.│
└───────────────────────────┬─────────────────────────────┘
                              │ calls
┌───────────────────────────▼─────────────────────────────┐
│  Provider layer                                            │
│  Uniform "send messages, get a completion" interface       │
│  across OpenRouter, Ollama, OpenAI, Anthropic, Gemini,      │
│  self-hosted. Every LLM call in the whole system passes    │
│  through here — this is also where observability is logged.│
└─────────────────────────────────────────────────────────┘
```

**AI Analysis and Clause Investigator do not need the agent layer.**
Analysis is a single structured call. Investigator is a fixed pipeline
(embed → retrieve → optimize context → generate). Neither involves a model
deciding what to do next. Only the AI Assistant is genuinely agentic. Do
not route Analysis or Investigator through agent machinery — use the
simplest layer that fits each capability.

### 3.2 The four pillars, plus Legal Knowledge

| Pillar | Kind | Agent layer needed? |
|---|---|---|
| AI Analysis | One-time structured extraction, triggered post-extraction | No |
| Clause Investigator | RAG — retrieve, then generate | No |
| AI Assistant | Tool-calling orchestrator over the other pillars | Yes |
| Organization Brain | Structured knowledge source (scalar config + a text corpus) | No (a retrieval source, not an agent) |
| Legal Knowledge Base | A second, shared (non-org-scoped) text corpus | No (reuses Investigator's retrieval engine) |

Legal Knowledge Base is not a fifth independent system — it is a third
corpus (alongside per-contract text and Organization Brain's corpus)
sharing the exact same chunking, embedding, retrieval, and citation
infrastructure built for Clause Investigator. One retrieval engine, three
corpora, differentiated by which index is queried and whether it's
org-scoped. See Section 8.

### 3.3 `packages/shared/ai` — target structure

This is the frozen target layout — the name, purpose, and eventual contents
of each folder, not a scaffold to create upfront. **Folders are created
incrementally, each one when the batch that actually implements it begins**
— not stubbed out in advance with placeholder READMEs. An empty,
documentation-only folder was considered and deliberately rejected in favor
of this: this document is the record of intended structure, so a folder
doesn't need to exist on disk before its content does to serve that
purpose. **What exists today** (`client.ts`, `embeddings.ts`, `index.ts` —
a flat structure predating this design) is noted explicitly so nobody
mistakes the current state for the frozen one.

```
packages/shared/ai/
  providers/    Provider abstraction (Phase 1). One OpenRouter
                implementation to start; Ollama/OpenAI/Anthropic/Gemini/
                self-hosted are additional adapters behind the same
                interface, added when actually needed.
  prompts/      Versioned prompt files (Phase 1/2). Never mutated in
                place — a new version is a new file.
  schemas/      Zod schemas for structured LLM outputs, one per
                AIAnalysisType, plus tool-argument schemas once the
                Assistant exists. Elevated in importance — this is where
                the "never persist unvalidated output" rule is enforced.
  tools/        Typed, parameterized functions the future Assistant calls.
                Not built until the Assistant is (Phase, Near Future).
  agents/       Orchestration logic. Folder exists now as a documented
                placeholder (see Section 12); no interface is defined
                until a first real agent (the Assistant) is built.
  evaluation/   Golden dataset, scoring scripts (Phase 1/2). Treated as
                load-bearing, not optional — see Section 11.
  registry/     Central lookup of active prompt/schema versions (e.g.
                "risk analysis currently uses prompt v3"). Not a plugin
                system — a lookup table.
  config/       Provider credentials, model defaults, cost limits.
  types/        Shared TypeScript types for the AI layer.
```

**What exists today, concretely, as of this document:**
- `packages/shared/ai/client.ts` — `getAIClient()`, `chatCompletion()`. A
  working OpenAI-SDK-based wrapper. Not yet reorganized into `providers/`.
- `packages/shared/ai/embeddings.ts` — `generateEmbedding()`,
  `generateEmbeddings()`, and a naive in-memory `cosineSimilarity()`. This
  cosine-similarity helper is pre-`pgvector` scaffolding — it does not
  scale past trivial data volumes and is superseded by Phase 3's real
  vector search, not something to build on further.
- `packages/workers/src/jobs/embeddings.job.ts` — computes an embedding
  and **discards it** (a literal `// TODO` in the file). Nothing calls
  this job today. It does real, billable OpenAI work for no stored result
  — do not enable triggering it before Phase 3 gives it somewhere to write
  to.
- `packages/api/src/lib/ai.ts`, `packages/api/src/lib/embeddings.ts` —
  re-exports of the above. Confirmed dead code: nothing in
  `packages/api/src` imports them.
- `AIAnalysis` (Prisma model, `schema.prisma`) — fully designed
  (`type`, `status`, `promptUsed`, `result: Json?`, `modelVersion`,
  `tokensUsed`), zero rows ever written by application code (only by the
  demo seed). No repository, service, controller, or route exists for it
  anywhere in `packages/api/src` as of this document.

This is the actual starting line for Phase 1. Nothing above should be
treated as a foundation to build directly on without first reorganizing it
into the target structure.

---

## 4. AI Request Lifecycle (generic)

Every AI call in the system, regardless of which pillar it belongs to,
follows the same shape:

```
Caller (Analysis service / Investigator / Assistant tool)
   │
   │  passes: messages, prompt ID + version, schema ID + version,
   │          model/temperature overrides if any
   ▼
Provider layer  ────────────────────────────────────────────┐
   │  resolves provider/model, sends request, times it,       │
   │  counts tokens                                            │
   ▼                                                            │
LLM Provider (OpenRouter → eventually others)                   │
   │  returns completion                                        │
   ▼                                                            │
Provider layer validates + logs observability row ──────────────┘
   │  (model, prompt version, schema version, tokens, cost,
   │   latency, retry count, validation success/failure)
   ▼
Caller validates structured output against its Zod schema
   │  (reject / retry / surface error — never persist unvalidated
   │   output)
   ▼
Caller persists result (if applicable) with prompt version +
schema version stamped on the record
```

The provider layer is the single choke point where observability logging
happens automatically for every call — callers do not need to remember to
instrument themselves. This is the concrete payoff of treating the
provider layer as the first thing built in Phase 1.

---

## 5. AI Analysis Lifecycle (Phase 2)

```
Contract reaches processingStatus = EXTRACTION_COMPLETED
   │
   ▼
AI Analysis triggered (automatic by default; must be re-triggerable
manually; must be re-runnable after prompt/model changes without
auto-firing on every contract in the system)
   │
   ▼
Analysis service builds prompt from extractedText + relevant
Organization Brain scalar settings (once Phase 4/Near-Future exists)
   │
   ▼
Provider layer call (Section 4), using the versioned prompt for this
analysis type (SUMMARY / RISK / CLAUSE_QUERY / future types)
   │
   ▼
Structured output validated against this analysis type's schema
   │  Terminal failure (malformed, refused) → AIAnalysis.status = FAILED
   │  Retryable failure (rate limit, timeout) → retry via existing
   │  retryable-vs-terminal classification, same pattern as
   │  extraction.job.ts's TerminalExtractionError
   ▼
New AIAnalysis row written — never an update to an existing row
   │  Stamped with: type, status, promptUsed, result (validated JSON),
   │  modelVersion, promptVersion, schemaVersion, tokensUsed
   ▼
Contract.processingStatus updated (AI_COMPLETED / AI_FAILED)
```

Long contracts exceeding a single model's context window are an accepted,
known limitation for MVP — handled by choosing a large-context model, not
by building chunked map-reduce summarization now.

---

## 6. Clause Investigator Lifecycle (Phase 3)

```
Contract text (Phase 3 MVP: contracts corpus only)
   │
   ▼
Clause-aware chunking (section/heading-aware, not fixed-size — chunk
boundaries matter for legal text and for citation quality)
   │
   ▼
Embedding generation (packages/shared/ai/embeddings.ts's existing
generateEmbedding, reorganized under providers/) per chunk, with
section/heading metadata attached
   │
   ▼
Stored in pgvector, org-scoped at the index/query level — never
filtered only after retrieval
   │
   │  ── query time ──
   ▼
User question
   │
   ▼
Hybrid retrieval: vector similarity + Postgres full-text search
(defined terms and exact legal phrases need keyword matching, not
just semantic similarity)
   │
   ▼
Context Optimizer seam (Section 9) — a single named passthrough
function today, real compression later if/when context size becomes
a measured problem
   │
   ▼
Provider layer call (Section 4) with retrieved chunks as context
   │
   ▼
Citation verification: every claim in the answer must resolve to an
actually-retrieved chunk. Reject/regenerate if a citation doesn't
resolve — never show a fabricated citation to the user.
   │
   ▼
Answer + sources returned
```

Full point-in-time reproducibility of retrieval state (what exactly was
indexed when this answer was generated) is deliberately **not** pursued —
chat answers are advisory and transient, unlike the permanent record an
`AIAnalysis` row represents. Log which chunks were retrieved on the
observability row for debugging; don't build index snapshotting.

---

## 7. AI Assistant Lifecycle (Near Future, not MVP)

Documented now because the platform's lower layers (provider, tools) need
to be built in a way that doesn't foreclose this, even though the
Assistant itself is not implemented until after Phase 3.

```
User question
   │
   ▼
Planner (an LLM call producing a validated, structured plan — a list
of {tool, args} — never free text re-parsed as instructions)
   │
   ▼
Plan executed: database queries, Analysis lookups, Investigator
retrieval, Organization Brain lookups — run in parallel where
possible, since the plan is decided upfront, not iteratively
   │
   ▼
Aggregate results (with an explicit cap on how much gets pulled in —
a broad query against a large portfolio must not silently blow past
context limits)
   │
   ▼
Context Optimizer seam
   │
   ▼
ONE final provider layer call, synthesizing an answer from the
aggregated, optimized context
   │
   ▼
Response
```

This is "Plan-and-Execute," not ReAct-style iterative tool-looping — the
number of LLM calls is bounded (plan, then synthesize), not open-ended.
**Known, accepted limitation:** genuinely multi-hop questions (where step
2's query depends on step 1's results) are not solved by a single upfront
plan. Documented as a future extension (a small, bounded number of
follow-up iterations), not built now.

**Non-negotiable security rule:** the LLM never generates raw SQL. Every
database access is a tool function with fixed, validated, org-scoped
parameters, written by developers. See Section 12 for why this is a
freeze-level rule, not a suggestion.

---

## 8. Organization Brain

Two genuinely different kinds of data, requiring different treatment —
conflating them was an early design mistake this document corrects:

**Scalar preferences** — preferred governing law, risk tolerance
thresholds. Plain structured fields, no AI involved at all. Extends
`OrganizationSettings` the same way `branding`/`notificationPreferences`
already work today.

**Text corpus** — templates, preferred clause language, policy excerpts.
Retrieved through the same chunking/embedding/retrieval engine as Clause
Investigator (Section 6), just pointed at an org-scoped corpus instead of
a single contract's text. This is the third corpus referenced in Section
3.2.

### MVP scope (Phase 4): ingestion and storage only

Per the frozen decision to start the data-accumulation clock early (a
customer-specific data moat compounds with time-in-use — Section 2):
Phase 4 builds the ability for an organization to upload/paste templates,
policies, and preferred clauses, and stores them. **No embedding, no
retrieval, no reasoning over this data in Phase 4.** The corpus exists and
grows; nothing consumes it yet.

**Known dependency, not solved by this document:** unlike Investigator's
corpus (auto-populated from every upload) and Legal Knowledge Base
(populated by Clausio from external sources), Organization Brain's corpus
requires a *customer* to manually contribute content. This is an
onboarding/product problem, not an architecture problem — flagged here so
it isn't silently forgotten once Phase 4 ships and the corpus stays empty
without deliberate prompting.

### Near Future: retrieval and reasoning

Once Investigator's retrieval infrastructure (Phase 3) is proven, extend
it to also index Organization Brain's corpus, and let Analysis reference
it (e.g., flagging a new contract's liability cap as a deviation from the
org's own preferred language). Automatic learning/inference from usage
patterns remains explicitly out of scope until there is real usage data to
learn from — not a near-term item at all.

---

## 9. Context Optimization Seam

A single named function sitting between "gathered context" (retrieved
chunks, aggregated query results) and the final provider layer call:

```
Tools / Retrieval → optimizeContext(gathered) → LLM Provider call
```

Today, a no-op (identity function). The seam exists because retrofitting
it later — once context-gathering logic is scattered across the planner,
tools, and aggregation code — is more expensive than naming the seam now.
This is **not** a pluggable strategy layer with a registry of swappable
implementations; that would be the same premature abstraction risk as
building `agents/` before an agent exists. It is one function with an
obvious home for future compression logic (semantic caching, deduplication,
relevance pruning) when a measured problem justifies it.

---

## 10. Prompt Lifecycle & Versioning

**Prompts are files, not database records.** `packages/shared/ai/prompts/`,
one file per version (`risk/v1.md`, `risk/v2.md`), never mutated once used
in production — a change is a new file. This keeps prompt changes subject
to the same code review discipline as any other change (a PR, a diff, a
history), which matters specifically because it's what makes the
evaluation gate (Section 11) actually enforceable — a prompt that can
change without a PR is a prompt that can change without running the golden
set first.

Git *is* the change history — do not hand-maintain a separate changelog.

**The registry** (`packages/shared/ai/registry/`) is the one place code
looks up which version is currently active for new analyses (e.g.
`{ risk: 'v3', summary: 'v2' }`). Rollback is changing the pointer back —
trivial, because the versioned files and the "what's active" pointer are
deliberately decoupled.

**Every `AIAnalysis` record permanently stores the prompt version** that
generated it. Old records are never re-pointed at a newer prompt version.

---

## 11. Schema Lifecycle & Versioning

Every structured AI output type has a versioned Zod schema in
`packages/shared/ai/schemas/`. **Old `AIAnalysis` rows are never migrated**
to match a newer schema — they are immutable snapshots (Section 2).
Instead, whatever reads `AIAnalysis.result` dispatches on the stored
`schemaVersion` and knows how to interpret each version it has ever
shipped. New schema versions should be additive (new optional fields)
where possible, specifically to keep that reader-side dispatch from
becoming an unmanageable branch tree.

**Regeneration is always an explicit action — a user or admin choosing to
re-analyze — never an automatic side effect of shipping a schema or prompt
change.** Auto-regenerating every historical analysis on deploy is an
unbounded, unpredictable cost event, and silently changing a customer's
stored analysis underneath them undermines trust in the platform as a
system of record.

**Known, deliberately deferred gap:** full reproducibility would also
require knowing which version of a contract's `extractedText` an analysis
was run against — today `extractedText` is simply overwritten on
re-extraction with no history. Named here as a real gap this document
surfaces without solving; revisit only as a deliberate decision, not by
default.

---

## 12. Evaluation

Prompt engineering without evaluation is unsustainable (Section 2) — this
section defines the methodology, not just a folder.

- **Golden dataset**: a curated set of contracts with human-verified
  correct answers per analysis type. Verifying correctness requires legal
  judgment, not engineering judgment — a real resourcing dependency, not
  just a technical task. Start small (10–20 real, anonymized contracts)
  and grow it; don't block on a large dataset before evaluating anything.
- **Summary quality**: no single correct summary exists — score via
  LLM-as-judge against a rubric, or a groundedness check (does every claim
  trace back to the extracted text).
- **Risk / obligation extraction**: structured, so precision/recall
  against golden labels is directly measurable.
- **Hallucination / groundedness**: run on *every* production analysis,
  not just eval runs — it doubles as a live safety net, flagging
  low-groundedness output for human review.
- **Latency, tokens, cost**: pure instrumentation — the same data
  Observability (Section 13) captures per call, aggregated here for
  before/after comparison.
- **Methodology**: any prompt or model change re-runs the golden set and
  diffs scores against baseline before merging — treated like a test
  suite gate, not a manual "looks good" judgment call. Full CI automation
  is a later upgrade once the golden set is large enough to be worth
  automating; a documented manual step is the correct amount of process
  for the current team size.

---

## 13. Observability

Unlike the abstractions this document defers, observability has no
interface-design risk — the schema is obvious and there is no unbuilt
future feature it depends on. Treated as first-class from Phase 1, not
something added once a capability matures.

A dedicated table (not `AuditLog` — that's business-action semantics with
actor/target meaning; this is operational telemetry with a different
shape, and mixing them pollutes both) capturing, per call: model used,
prompt version, schema version, tokens in/out, estimated cost, latency,
retry count, validation success/failure, worker execution time.

**Written by the provider layer itself**, not by each capability's own
code — every call through the provider abstraction logs itself
automatically. This is the concrete reason the provider layer is built
first: it's the one choke point every current and future AI capability
passes through.

Prompt version and schema version appear on **both** the observability
row and the stored `AIAnalysis` record, for genuinely different reasons:
the analysis record explains how to interpret that specific result
forever; the observability log lets you ask "did switching prompt
versions change our average cost or latency," which the analysis record
alone can't answer.

Stored in Postgres alongside everything else — no new service — consistent
with every other infrastructure decision made for this production
environment (see `Clausio_Deployment_Architecture.md`).

---

## 14. Security Principles

- **Every retrieval query is org-scoped at the query layer itself**, never
  filtered only after the fact. A cross-tenant retrieval leak in a legal
  SaaS is an incident, not a bug.
- **No LLM-generated SQL, ever.** The Assistant (and any future
  capability) accesses data through fixed, typed, parameterized,
  org-scoped tool functions written by developers.
- **Human approval is required before any AI-generated content leaves the
  organization** — a drafted notice, a suggested counter-clause, an
  outgoing email. Modeled as data (an approval record with
  pending/approved/rejected states and an approver), not just "someone can
  edit it before sending."
- **Explainability is a user-facing requirement**, not an internal
  debugging convenience — every AI claim should be traceable to its
  source in the product UI, not just in observability logs.
- **Deletion must propagate to derived AI artifacts.** When a contract is
  deleted, its embeddings, cached analyses, and any Organization Brain
  references must not linger as orphaned data. Design this into the
  retrieval pipeline now; don't discover the gap during a security audit.
- **The provider abstraction is a compliance feature, not just a
  cost/quality one.** Multi-provider routing (Section 3.3) also means a
  specific organization's AI calls can be routed to a specific provider or
  region for data-residency requirements — a real payoff of a decision
  already made for other reasons.

---

## 15. AI Design Philosophy

Summarized from Sections 2–14 as the short version:

Build the simplest layer that fits each capability — not every capability
needs to be an agent. Validate before persisting, always. Version content
that changes over time (prompts, schemas); record parameters that don't
(temperature, model). Never let data-accumulating capabilities (Organization
Brain) wait behind reasoning-capable capabilities that consume them — start
collecting before you're ready to use it. Treat evaluation and observability
as instrumentation for what you're building this sprint, not speculative
infrastructure for later. Defer abstractions (Agent interface, pluggable
context optimizers, cross-domain platforms) until at least two real
implementations exist to generalize from — one example is a guess, two is
a pattern.

---

## 16. Implementation Scope — MVP

### Phase 1 — AI Foundation

- Provider abstraction (`providers/`), OpenRouter as the first
  implementation
- Prompt management (`prompts/` as versioned files, `registry/` for active
  versions)
- JSON schema validation (`schemas/`) — no unvalidated output ever
  persisted
- AI worker orchestration (BullMQ job conventions matching
  `extraction.job.ts`'s existing retryable-vs-terminal pattern)
- AI observability (Section 13) — built into the provider layer from its
  first implementation
- AI evaluation framework (Section 12) — golden dataset creation starts in
  parallel with Phase 2, not after it
- Context optimization seam (Section 9) — a named no-op function
- Prompt versioning (Section 10)
- Schema versioning (Section 11)
- API contracts for `AIAnalysis` (repository, service, controller, routes
  — none exist today, see Section 3.3)
- Database models: `AIAnalysis` already exists; add `promptVersion` and
  `schemaVersion` fields (the schema currently has `modelVersion` but not
  these two — a gap to close before any real data is written, not after)

### Phase 2 — AI Analysis

- Contract summary, metadata extraction, risk analysis, risk score, red
  flag detection, timeline extraction, obligation extraction, contract
  health score, suggested metadata — all structured outputs of the single
  Analysis pipeline (Section 5), not separate systems. Red Flag Detection,
  Contract Health Score, and Timeline/Obligation extraction are views over
  structured Analysis output, not independent AI calls.
- Structured, persistent results — validated against Phase 1's schemas,
  immutable per Section 2

### Phase 3 — Clause Investigator

- Chunking (clause/section-aware), embeddings, `pgvector`, hybrid
  retrieval (vector + Postgres full-text), citation verification,
  explainable answers (Section 6)
- Multi-corpus architecture designed for three corpora (Section 3.2), but
  **only the Contracts corpus is populated in MVP**

### Phase 4 — Early Organization Brain

- Ingestion and storage only (Section 8) — organization policies,
  templates, preferred clauses, internal guidelines
- Explicitly **no** reasoning, **no** AI retrieval, **no** automatic
  learning in this phase — collection and indexing only, started early
  specifically because the data-accumulation clock matters more than
  reasoning-readiness (Section 2)

### Explicitly NOT part of the MVP

Everything in Section 17 below.

---

## 17. Future Roadmap

Not implemented now. Documented so every future capability has a stated
home in the architecture above, rather than needing its own design
discussion to figure out where it belongs.

### Near Future

- **AI Assistant** (Section 7) — plan-and-execute orchestration over
  Analysis, Investigator, and structured queries
- **Organization Brain retrieval** — indexing the Phase 4 corpus through
  Investigator's retrieval engine; Analysis referencing it for deviation
  flagging
- **Organization Settings** expansion for AI-specific preferences
- **Legal Knowledge Base** (Section 3.2) — RAG over jurisdiction-tagged
  external legal sources, reusing Investigator's retrieval engine, one
  jurisdiction at a time (start where real customers are, not all four
  discussed jurisdictions at once)
- **Witness Assistant** — a plain-language explanation of a contract for
  non-legal-expert witnesses, built on Analysis's existing summary output
  for a different audience — low-risk, reuses infrastructure already
  built by this point

### Medium Term

- **AI Draft Review, Clause Rewriter, Negotiation Assistant, Organization
  Standards Checker** — one capability area, not four (all four need the
  same thing: comparing against Organization Brain's standards). The
  generative members of this group (Rewriter, Negotiation Assistant) carry
  a different risk profile than extraction/retrieval — generated legal
  language requires a human-approval gate (Section 14) by design, not as
  an afterthought.
- **Clause Comparison** — a specialized Investigator query (retrieve the
  relevant clause from two contracts, compare), not a new pillar
- **Obligation Automation** — turning Phase 2's extracted obligations into
  actioned workflow (drafting the renewal notice, not just displaying the
  date) — the concrete example of "AI performs work" (Section 2)
- **AI Approval Workflows** — formalizing the human-approval gate
  (Section 14) as a first-class data model (approval records, approver
  roles, audit trail), not just an ad hoc review step
- **Explainability improvements** — per-field confidence, self-consistency
  verification on high-stakes fields (liability caps, indemnification
  scope), citation-forced generation with runtime verification

### Long Term

- **Due Diligence Mode** — batch-querying the whole portfolio against a
  standard checklist, producing an exportable report; reuses the
  Assistant's orchestration, packaged differently
- **Portfolio Intelligence** — aggregation/reporting over Phase 2's
  structured output across many contracts; mostly SQL, not new AI calls
- **Contract Drift Reconciliation** — ingesting amendments/addenda and
  maintaining one coherent, always-current view of a contract relationship
- **Negotiation Intelligence** — benchmarking against the org's own
  historical negotiation outcomes; requires years of accumulated data,
  which is exactly why Phase 4 starts collection early
- **Compliance & Jurisdiction Advisor** — the productized form of Legal
  Knowledge Base, once it covers enough jurisdictions to be advisory
- **Workflow Intelligence** — deferred until concrete trigger→action
  examples exist; too vague to design against today
- **Security Agent** — a different domain entirely (dependency review,
  OWASP guidance, infra review). Only the generic provider layer and
  agent-orchestration mechanics (Section 3.1) would ever be shared; its
  tools, prompts, and schemas would live in a fully separate namespace,
  never mixed with legal/contract domain code. Not designed further than
  this until there is an actual product requirement for it.
- **Multi-modal ingestion** — scanned exhibits, image-heavy documents;
  the extraction pipeline should not assume it will always receive clean
  text, but a vision-based extraction path is not built until needed
- **Semantic cache** — sits at or near the Context Optimizer seam
  (Section 9); a natural, low-risk extension when cost/latency at scale
  justifies it
- **Multi-party AI agents** — negotiation correspondence with a
  counterparty's own system, under human supervision. A genuine 5-year
  north star, not a near-term commitment — noted here so that if/when a
  generic Agent abstraction is eventually extracted (Section 3.1, after
  two real internal agents exist), it's designed knowing it may eventually
  need to support external, multi-party participants, not just internal
  tools.

---

## 18. Guidance for AI Coding Assistants

Read this section before writing any AI-related code in this repository,
whether you are Claude Code, Codex, or a human following the same
discipline. It exists to prevent architectural drift as implementation
proceeds across many sessions and multiple people.

**Before adding anything AI-related:**
- Check `packages/shared/ai/` for an existing provider, schema, prompt, or
  tool that already does what you need before writing a new one.
- Check Section 16 (Implementation Scope) to confirm the capability you're
  about to touch is actually in scope. If it's in Section 17 (Future
  Roadmap), it is not to be implemented — only its stated extension point
  in the architecture may be prepared for, if explicitly asked.

**Always:**
- Route every LLM call through the provider layer (`providers/`). Never
  call an SDK directly from a controller, service, or job.
- Treat prompts as versioned files under `prompts/`, referenced by ID and
  version. Never embed a prompt as an inline string in application code.
- Validate every structured LLM output against its Zod schema in
  `schemas/` before persisting it. An unvalidated `AIAnalysis.result`
  write is a bug, not an acceptable shortcut.
- Stamp `promptVersion` and `schemaVersion` on every persisted AI result.
- Scope every retrieval/database query used by AI capabilities to the
  current organization, explicitly, at the query itself.
- Reuse the retryable-vs-terminal error classification pattern already
  established in `extraction.job.ts` for any new AI-related BullMQ job.
- Gate any AI-generated content that could leave the organization behind
  an explicit human-approval step.

**Never:**
- Never let an LLM generate raw SQL, under any capability, for any reason.
- Never mutate an existing prompt or schema in a way that changes the
  meaning of already-persisted `AIAnalysis` rows. A new version is a new
  file/schema; old rows are read through version-aware logic, never
  rewritten.
- Never write a migration or backfill job that regenerates existing
  `AIAnalysis` records to match a new schema. Regeneration is always an
  explicit, deliberate action a user or admin takes — never an automatic
  side effect of a deploy.
- Never build a generic `Agent` interface, a pluggable Context Optimizer
  registry, or a cross-domain (e.g., security-review) AI subsystem
  speculatively. These are deferred by name in this document (Sections
  3.1, 9, 17) until at least two real implementations exist to generalize
  from.
- Never skip observability logging for an AI call "because it's a small
  one" — the provider layer logs every call by construction; don't
  bypass it by calling a provider SDK directly.
- Never introduce a new, parallel AI pathway that skips the provider,
  schema, prompt, evaluation, or observability layers, even for a
  "temporary" or "just this once" capability. Extend the platform.

**Where new AI features belong:**
- A new *type* of one-time structured extraction → extends AI Analysis
  (Section 5), with a new schema in `schemas/` and a new prompt in
  `prompts/`.
- A new kind of question-answering over existing text → extends Clause
  Investigator's retrieval (Section 6), potentially as a new corpus
  (Section 3.2) if the source material isn't per-contract text.
- A new way of combining existing capabilities to answer a broader
  question → extends the AI Assistant's tool set (Section 7), once it
  exists — a new tool function, not a new orchestration system.
- A new source of organizational knowledge → extends Organization Brain
  (Section 8) as either a scalar setting or a corpus entry, not a new
  subsystem.

If a task doesn't clearly map to one of the above, stop and raise it for
discussion rather than inventing a new architectural pattern to fit it.

---

## Architecture Freeze

This document defines the official AI architecture of Clausio.

Changes to this architecture should not be made during feature
implementation. Any architectural change should first be discussed,
evaluated, and explicitly approved before being merged — the same
discipline already applied to `Clausio_Deployment_Architecture.md`.

Feature work extends this architecture rather than replacing or bypassing
it. If an implementation task seems to require deviating from what's
written here, that is a signal to stop and discuss, not a signal to route
around the document.
