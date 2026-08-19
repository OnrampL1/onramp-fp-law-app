import type { InvestigatorAnswer, LegalKbAnswer } from "../retrieval/investigator";
import type { ToolName } from "./definitions";

// Server-injected only - never populated from anything the LLM produced.
// The planner/executor never accept an organizationId argument from a plan
// step (see tools/schemas.ts); this is the one place a real organizationId
// enters tool execution, supplied by the caller (the future
// POST /assistant/ask controller, Batch 4) from req.user.orgId, the same
// way contractInvestigatorController.ask already does today.
export interface ToolExecutionContext {
  organizationId: string;
}

// ─── Per-tool result shapes ─────────────────────────────────────────────
//
// askContractQuestion/searchOrganizationBrain/searchLegalKnowledge reuse
// InvestigatorAnswer/LegalKbAnswer directly - those types already live in
// this package (retrieval/investigator.ts) and are already
// citation-verified by answerContractQuestion/answerOrganizationBrainQuestion/
// answerLegalKbQuestion, so there is nothing to duplicate.
//
// searchContracts/getContractAnalysis mirror api-layer DTOs
// (ContractListRow, RiskOverviewDto, SummaryOverviewDto) that live in
// packages/api and can't be imported from here (packages/shared has no
// dependency on packages/api - only the reverse). Same "mirror, don't
// import across the boundary" pattern already used for
// LegalCitedSource/LegalKbSource. Batch 2, which wires the real
// implementations, is the source of truth for keeping these mirrors
// accurate.

export interface SearchContractsResultItem {
  id: string;
  title: string;
  counterparty: string;
  // Nullable to match Contract.legalState itself (nullable in
  // schema.prisma - not yet computed for a contract still mid-processing).
  legalState: string | null;
  tags: string[];
  expirationDate: string | null;
}

export interface SearchContractsResult {
  contracts: SearchContractsResultItem[];
  // How many contracts matched the filters in total, vs. how many are in
  // `contracts` above - lets the final synthesis step (Batch 3) say "found
  // 12 matching contracts, showing the first 5" instead of silently acting
  // as if the list were exhaustive (AI_ARCHITECTURE.md Section 7's
  // "explicit cap on how much gets pulled in" requirement).
  totalMatched: number;
}

// Mirrors packages/api/src/types/ai-analysis.types.ts's RiskFlagDto exactly
// (severity, category, description, sourceText) - kept in sync by hand,
// same boundary reasoning as the file-level comment above.
export interface ContractAnalysisRedFlag {
  severity: string;
  category: string;
  description: string;
  sourceText: string;
}

export interface GetContractAnalysisResult {
  contractId: string;
  // null, not an error, when that analysis type hasn't completed for this
  // contract yet - a normal, expected state (e.g. a contract still
  // PENDING_EXTRACTION), not a tool failure.
  risk: {
    analysisId: string;
    healthScore: number;
    summary: string;
    redFlags: ContractAnalysisRedFlag[];
  } | null;
  summary: {
    analysisId: string;
    text: string;
  } | null;
}

export interface AskContractQuestionResult extends InvestigatorAnswer {
  contractId: string;
}

export type SearchOrganizationBrainResult = InvestigatorAnswer;

export type SearchLegalKnowledgeResult = LegalKbAnswer;

// ─── Discriminated union over every tool's result ───────────────────────

export type ToolResult =
  | { tool: "searchContracts"; data: SearchContractsResult }
  | { tool: "getContractAnalysis"; data: GetContractAnalysisResult }
  | { tool: "askContractQuestion"; data: AskContractQuestionResult }
  | { tool: "searchOrganizationBrain"; data: SearchOrganizationBrainResult }
  | { tool: "searchLegalKnowledge"; data: SearchLegalKnowledgeResult };

// ─── Execution plumbing ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolExecuteFn<Args = any> = (
  args: Args,
  context: ToolExecutionContext,
) => Promise<ToolResult>;

// Partial, not Record<ToolName, ...> - Batch 1 ships the mechanism with no
// implementations wired at all; Batch 2 supplies them. The executor treats
// a missing implementation as a normal per-step failure (see executor.ts),
// not a startup error, so the mechanism is fully testable before any real
// tool exists.
export type ToolImplementations = Partial<Record<ToolName, ToolExecuteFn>>;
