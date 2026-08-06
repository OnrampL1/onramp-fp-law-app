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

### Contract Type / Categorization

- Identified: Contract List feature (2026-07-12)
- Classification: Open question — not yet justified as a real requirement
- Status: Rejected as a generic string field for now
- Notes: Frontend mock data has a `type` column (MSA/NDA/License/etc.), but
  no business rule was identified that actually requires it. Revisit only
  if a genuine categorization need emerges — design a proper enum/entity
  then, not a free-text field now.

## Resolved Items

### Effective Date

- Identified: Contract List feature (2026-07-12)
- Classification: Required for correctness (completes the contract
  lifecycle — we tracked when a contract ends but not when it starts)
- Resolution: Approved. Implementation in progress.
