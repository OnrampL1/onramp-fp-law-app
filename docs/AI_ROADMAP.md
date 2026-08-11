# Clausio AI Roadmap

Status: **Frozen — sequencing and scope.** This document is the single
source of truth for AI phase order and phase status. `AI_ARCHITECTURE.md`
remains authoritative for *how* the AI platform is built (the frozen
mechanisms — provider layer, prompt/schema versioning, evaluation
methodology, security rules). `AI_IMPLEMENTATION_GUIDE.md` remains
authoritative for *phase-level execution detail* (files owned, completion
criteria, instructions for an implementer). This document is authoritative
for *which phase is next and what phase number means what*.

If any other document's phase numbering ever disagrees with this one, this
document wins, and the conflict should be raised for discussion — not
silently resolved by editing either document without approval.

This document assumes no prior context. A developer — human or AI coding
assistant — should be able to read it once and know exactly what phase
Clausio's AI platform is in, what's next, and what's explicitly not
started yet.

---

## 1. Phase Status (authoritative)

| Phase | Name | Status |
|---|---|---|
| 1 | AI Foundation | ✅ Complete |
| 2 | AI Analysis Engine | ✅ Complete |
| 3 | Clause Investigator | 🚧 In progress — teammate implementing |
| 4 | Organization Brain Ingestion | 🚧 In progress — teammate implementing |
| 5 | Organization Brain Retrieval | ⏳ Future — not started |
| 6 | Lebanese Legal Knowledge Base | ⏳ Future — not started |
| 7 | AI Assistant | ⏳ Future — not started |
| 8 | Advanced AI Features | ⏳ Future — not started |

**Do not begin implementation work on Phase 5, 6, 7, or 8 without explicit
instruction to start that specific phase.** This applies to AI coding
assistants as much as to human developers — being asked to "help with the
AI roadmap" or "continue the AI platform" is not the same as being asked
to start a specific future phase.

---

## 2. Why AI Assistant is Phase 7, not Phase 5

An earlier architecture discussion (see `AI_ARCHITECTURE.md` Section 7 and
`AI_IMPLEMENTATION_GUIDE.md`'s original Dependencies diagram) placed the AI
Assistant directly after Phase 3, reasoning that it only *structurally*
depends on Analysis (Phase 2) and Investigator (Phase 3) as tools.

That technical dependency is still true — nothing about the Assistant's
plan-and-execute architecture (Section 7) requires Organization Brain
Retrieval or the Legal Knowledge Base to exist first. This is a **product
sequencing decision, not a technical one**, made explicitly:

Clausio does not want to ship the Assistant as a thin, two-tool chatbot
(Analysis + Investigator only). The Assistant is meant to orchestrate a
mature set of capabilities — Analysis, Investigator, Organization Brain,
and eventually the Legal Knowledge Base. Building it earlier would mean
either re-launching/re-announcing it every time a new tool is added, or
shipping a version of the product's most visible AI feature that
undersells what the platform can actually do.

**This is an intentional, approved roadmap amendment**, not an accidental
contradiction with `AI_IMPLEMENTATION_GUIDE.md`'s original diagram. That
diagram is updated (see the file itself) to match this document.

The underlying architecture is unaffected: the Assistant is still, and
will remain, an **orchestration layer that consumes existing capabilities
as tools** (Section 3.1's three-layer model), not a new or parallel AI
architecture. See Section 3 below.

---

## 3. Architectural Principle (unchanged, frozen)

```
Provider Layer
    ↓
Tool / Retrieval capabilities
    ↓
Agent / Orchestration layer
```

The AI Assistant (Phase 7) is the orchestration layer. It is not a
separate AI system — it is expected to consume Analysis, Investigator,
Organization Brain, and Legal Knowledge Base as **tools**, per the rule
already frozen in `AI_ARCHITECTURE.md` Section 18: *"A new capability
should generally be a new tool/function, not a new orchestration
system."* Delaying the Assistant to Phase 7 changes *when* it's built, not
*what* it's built from.

---

## 4. Retrieval Architecture (frozen direction)

Clausio will use **one shared retrieval engine**, not one per corpus:

```
                    Shared Retrieval Engine
                             |
              +--------------+--------------+
              |              |              |
              ↓              ↓              ↓
          Contracts     Organization     Legal
          (Phase 3)     Brain            Knowledge Base
                         (Phase 5)       (Phase 6)
```

- **Contracts** (Phase 3) and **Organization Brain** (Phase 5) content is
  **organization-scoped** — every query filtered at the query layer
  itself, per `AI_ARCHITECTURE.md` Section 14.
- **Legal Knowledge Base** (Phase 6) is **shared / unscoped** across
  tenants. It must not accidentally inherit organization scoping, and it
  must not be filtered by org at all — that exception should be
  structurally explicit in whatever implements it, not an incidental gap.
- Chunking, embedding, `pgvector` storage, hybrid retrieval, and citation
  verification are **one implementation**, parameterized by corpus type.

**Do not create**, for Phase 5 or Phase 6:
- a second chunking pipeline
- a second embedding pipeline
- a second `pgvector` implementation
- a second citation-verification implementation
- a separate RAG engine for the Legal Knowledge Base

Phase 5 extends the retrieval infrastructure Phase 3 establishes. Phase 6
reuses the same infrastructure again. Neither phase owns a retrieval
engine of its own.

---

## 5. Evaluation Strategy (frozen direction)

Three evaluation sources exist, and they are **not equivalent** — mixing
them risks treating an engineering guess as legal ground truth:

| Source | Who creates it | What it validates | Legal ground truth? |
|---|---|---|---|
| **A. Engineering Evaluation Set** | Engineering | Objective, mechanically verifiable facts: extraction, dates, parties, amounts, clause presence, missing information, contradictions, groundedness, adversarial behavior | No |
| **B. Public Benchmarks** (CUAD, and potentially others) | External | General contract understanding, extraction recall against real (non-Lebanese) contracts | No — never treated as Lebanese-law validation |
| **C. Legal-Verified Evaluation Set** | Qualified legal reviewer | Legal interpretation, risk severity, enforceability, legal acceptability, Lebanese-law correctness | Yes, once it exists |

Clausio does **not** currently have legal expertise available. Category C
therefore stays empty. **Do not fabricate legal ground truth** — no
engineering-authored label is ever presented, tagged, or scored as if it
were a legally verified answer. Category C is a recorded future
dependency (Section 8 below), not something to approximate now.

### Implementation direction (for when evaluation work resumes)

The existing framework (`packages/shared/ai/evaluation/`) is the
foundation and is **not being redesigned**. `runGoldenSet()` stays as-is;
evolution is incremental:

- Groundedness checking for `RISK` output, using the existing `sourceText`
  field already required on every flag.
- Adversarial / regression cases (e.g. a contract with no risk clauses;
  a contract with embedded prompt-injection-style text).
- `source` metadata tag: `engineering` | `public-benchmark` | `legal-verified`.
- `category` metadata tag: `happy-path` | `adversarial`.
- `jurisdiction` metadata field, supported on every case (nullable /
  `"generic"` by default) so cases don't need retrofitting once
  Lebanon-specific cases exist.
- Public benchmark cases (CUAD, etc.) stored and reported separately from
  Clausio's own engineering set.
- Eventual semantic/LLM-as-judge evaluation for free-text outputs
  (`summary.text`, flag `description`), replacing substring-based
  groundedness once that becomes the limiting factor.

None of the above is being implemented in this pass. It's recorded here so
the next evaluation-focused task starts from an agreed plan instead of a
fresh discussion.

---

## 6. Lebanese Legal Knowledge Base (frozen direction, not implemented)

```
Trusted Lebanese Legal Sources
        ↓
Legal Knowledge Base
        ↓
Shared Retrieval Engine  (Section 4)
        ↓
LLM
        ↓
Grounded Answer + Citation
```

**No schema, no migration, no ingestion exists or is planned in this
pass.** The following is the agreed *direction* for when Phase 6 begins.

### Source authority (eventual)

Sources should eventually be distinguished by authority tier:

1. **Binding legislation** — Official Gazette publications, the Codes
   (Code des Obligations et des Contrats, Commercial Code, Labor Code,
   etc.), decrees.
2. **Jurisprudence** — court decisions, particularly Cour de Cassation;
   binding vs. persuasive depends on court level.
3. **Legal doctrine** — treatises, recognized commentary. Persuasive, not
   binding.
4. **Administrative guidance** — ministry circulars, regulatory guidance.

### Metadata every legal source should eventually support

- `sourceType` (legislation / code / decree / jurisprudence / doctrine /
  administrative)
- `authorityTier`
- `officialCitation`
- `jurisdiction`
- `language` (Arabic, French, and English source versions preserved as
  **distinct linked records**, not merged/translated into one canonical
  version)
- `publicationDate`
- `effectiveDate`
- `legalStatus` (in force / repealed / amended)
- amendment / supersession relationships (`supersedes` / `supersededBy`)
- `provenance` / source URL
- preserved original text, alongside any extracted/OCR'd text

### Versioning

Legal sources must **not** be overwritten when legislation changes.
Amendments are represented with effective-dating/versioning so historical
and current law remain distinguishable — the same non-destructive
versioning principle already frozen for prompts and schemas
(`AI_ARCHITECTURE.md` Sections 10–11), applied to a new content type
rather than reinvented.

### Citation

Every claim resolves to a specific source record and passage, using the
same citation-verification mechanism already frozen for Clause Investigator
(`AI_ARCHITECTURE.md` Section 6) — not a second mechanism.

### Explicitly not claimed

Clausio does not currently have Lebanese legal expertise in-house. This
document does not assert legal correctness of anything; it records an
architectural direction for a system that, once built, will still require
legal review before its output can be trusted (Section 8).

---

## 7. Model Strategy (frozen direction)

- **OpenRouter is the primary production AI provider.**
- **Local/Ollama models are a future experimental option only** — gated
  behind a concrete driver (data residency, cost at scale, latency), not
  implemented now.
- **No Ollama provider is implemented in this pass.**
- **No specific Arabic/legal model is chosen in this pass.**
- **No fine-tuning happens in this pass.**

Potential future candidates (not selected, not benchmarked yet):
Qwen, Command R Arabic, Jais, Legal-BERT-style models, other
Arabic/multilingual/legal models.

**Model selection must be evidence-based**, when the time comes:
candidates are benchmarked against the same evaluation datasets
(Section 5), considering quality, groundedness, extraction accuracy,
Arabic performance, latency, cost, licensing, and privacy/data residency.

Specialized models are more likely to be useful for **embeddings,
reranking, and narrow classification** than for generating the final
legal answer — generation stays on a general-purpose reasoning model
unless evidence says otherwise.

---

## 8. Cross-Cutting Dependencies

These are **not** blockers for current engineering work (Phase 3/4), but
they are real project dependencies that later phases cannot skip.

### 8.1 Jurisdiction / governing law (Domain Review prerequisite for Phase 6)

Confirmed: no `jurisdiction` or `governingLaw` field exists anywhere in
`packages/shared/prisma/schema.prisma` today (checked directly against the
schema, not assumed). The Legal Knowledge Base fundamentally needs to know
which jurisdiction a contract or organization cares about in order to
retrieve relevant law.

Before Phase 6 implementation begins, a Domain Review must decide:

- Whether `Contract` needs a `governingLaw` field.
- Whether `OrganizationSettings` needs a jurisdiction / preferred-law
  setting.
- Whether both are required.
- How multiple jurisdictions should be represented (a contract can
  reference a jurisdiction different from the organization's home
  jurisdiction).
- How historical vs. current jurisdictional context should work (a
  contract signed under a since-amended law).

Tracked as an Open Item in `docs/DOMAIN_REVIEW_BACKLOG.md`. **No schema
change is made now.**

### 8.2 Legal expert / reviewer

Two future activities require qualified legal review and cannot proceed
without it:

1. Building the **Legal-Verified Evaluation Set** (Section 5, Category C).
2. Validating the **Legal Knowledge Base**'s content and any legal
   interpretations it produces (Section 6).

Finding a qualified legal reviewer or consultant is recorded as a future
project dependency. It does not block current engineering work (Phase 3
or Phase 4), but Phase 6 and Category C cannot be considered
production-ready without it — this is a resourcing dependency, not an
engineering task.

---

## 9. Future Product Opportunities (not scoped to any current phase)

Previously discussed capabilities, kept for visibility, explicitly **not**
part of current implementation scope unless already covered by Phase 1–4:

- AI Contract Summary, Risk Scoring, Red Flag Detector, Contract Timeline,
  Obligation Tracker, Contract Health Score, Suggested Metadata —
  **already covered**: these are views over Phase 2's structured `RISK`
  output, not new work (`AI_ARCHITECTURE.md` Section 16).
- Clause Comparison — future, a specialized Investigator query (Phase 3+),
  not a new pillar.
- Witness Assistant — future, built on Phase 2's summary output for a
  different audience.
- AI Draft Review, AI Clause Rewriter, AI Negotiation Assistant — future,
  Phase 8, require Organization Brain (Phase 5) as a comparison baseline
  and a human-approval gate by design.
- Natural-language contract querying — covered by Investigator (Phase 3)
  for single-contract QA; broader portfolio querying is Phase 7
  (Assistant) territory.
- Organization Brain — Phase 4 (ingestion, in progress) / Phase 5
  (retrieval, future).
- Lebanese Legal Knowledge Base — Phase 6, future.
- Advanced multi-tool AI Assistant capabilities — Phase 7, future.
- Contract Drift Reconciliation — future, Phase 8 or later, long-term item
  per `AI_ARCHITECTURE.md` Section 17.
- Future security-focused AI agent — explicitly out of scope for the
  legal/contract domain entirely; would be a fully separate namespace if
  ever built (`AI_ARCHITECTURE.md` Section 17).

None of the above is implemented by naming it here. This section exists so
a future planning conversation doesn't have to re-derive the list.

---

## 10. Guidance for AI Coding Assistants

- This document is authoritative for **phase number and phase status**.
  `AI_ARCHITECTURE.md` is authoritative for **mechanism**.
  `AI_IMPLEMENTATION_GUIDE.md` is authoritative for **phase-level
  execution detail**. If you find any of the three disagreeing on
  sequencing, stop and flag it — don't silently pick one.
- Do not start Phase 5, 6, 7, or 8 because a task mentions the AI roadmap,
  the Assistant, the Legal Knowledge Base, or Organization Brain
  retrieval in passing. Starting a phase requires an explicit instruction
  to start that phase.
- Do not create Legal Knowledge Base schema, migrations, or ingestion
  code from this document. It records direction, not an implementation
  ticket.
- Do not fabricate legal ground truth anywhere in the evaluation
  framework, under any circumstance, regardless of how confident a
  generated label looks.
- Do not implement an Ollama/local-model provider, and do not select a
  specific Arabic or legal model, without an explicit instruction and the
  evidence-based benchmarking described in Section 7.
- When Phase 5 or Phase 6 do begin, re-read this document's Sections 4–8
  first — they are the agreed starting point, not a discussion to redo
  from scratch.
