import {
  answerContractQuestion,
  answerOrganizationBrainQuestion,
  answerLegalKbQuestion,
  type ToolExecutionContext,
  type ToolResult,
  type ToolImplementations,
  type SearchContractsArgs,
  type GetContractAnalysisArgs,
  type AskContractQuestionArgs,
  type SearchOrganizationBrainArgs,
  type SearchLegalKnowledgeArgs,
} from "@starter-kit/shared";
import { contractRepository } from "../repositories/contract.repository";
import { aiAnalysisService } from "./ai-analysis.service";
import type { AppError } from "../middleware/error-handler";
import type { ContractListFilters, ContractListSort, ContractListPagination } from "../types/contract.types";

// Every implementation below is a thin wrapper around an already-existing,
// already organization-scoped repository/service call, or around one of the
// shared package's already citation-verified retrieve->generate->verify
// pipelines (answerContractQuestion / answerOrganizationBrainQuestion /
// answerLegalKbQuestion). None of them touch Prisma, embeddings, or
// retrieval directly - there is nothing here to keep in sync with those
// implementations because nothing here reimplements them.
//
// context.organizationId is the only source of tenant scoping used
// anywhere in this file - always the caller-supplied
// ToolExecutionContext (itself always req.user.orgId, injected by the
// future assistant controller in Batch 4, never anything from a plan
// step's `arguments`, since none of the five argument schemas
// (packages/shared/ai/tools/schemas.ts) accept an organizationId field).

// Internal cap on how many contracts one searchContracts call can return -
// not exposed to the model as an argument (its own arguments schema has no
// page/pageSize). Same default page size the contract list endpoint itself
// uses (contract.schemas.ts's DEFAULT_PAGE_SIZE), chosen for the same
// reason: enough to be useful, small enough that a broad query can't
// silently blow past the final synthesis call's context budget
// (AI_ARCHITECTURE.md Section 7's "explicit cap on how much gets pulled
// in").
const ASSISTANT_SEARCH_CONTRACTS_LIMIT = 20;

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && (error as AppError).statusCode === 404;
}

async function searchContracts(
  args: SearchContractsArgs,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const filters: ContractListFilters = {
    search: args.search,
    legalState: args.legalState,
    tag: args.tag,
    expirationBucket: args.expirationBucket,
  };
  const sort: ContractListSort = { field: "updatedAt", direction: "desc" };
  const pagination: ContractListPagination = {
    page: 1,
    pageSize: ASSISTANT_SEARCH_CONTRACTS_LIMIT,
  };

  const [rows, totalMatched] = await Promise.all([
    contractRepository.findMany(context.organizationId, filters, sort, pagination),
    contractRepository.count(context.organizationId, filters),
  ]);

  return {
    tool: "searchContracts",
    data: {
      contracts: rows.map((row) => ({
        id: row.id,
        title: row.title,
        counterparty: row.counterparty,
        legalState: row.legalState,
        tags: row.tags,
        expirationDate: row.expirationDate ? row.expirationDate.toISOString() : null,
      })),
      totalMatched,
    },
  };
}

async function getContractAnalysis(
  args: GetContractAnalysisArgs,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const contract = await contractRepository.findById(args.contractId, context.organizationId);
  if (!contract) {
    throw new Error("Contract not found in this organization");
  }

  const [risk, summary] = await Promise.all([
    aiAnalysisService.getRiskOverview(args.contractId, context.organizationId).catch((error) => {
      if (isNotFoundError(error)) return null;
      throw error;
    }),
    aiAnalysisService.getSummaryOverview(args.contractId, context.organizationId).catch((error) => {
      if (isNotFoundError(error)) return null;
      throw error;
    }),
  ]);

  return {
    tool: "getContractAnalysis",
    data: {
      contractId: args.contractId,
      risk: risk
        ? {
            analysisId: risk.analysisId,
            healthScore: risk.healthScore,
            summary: risk.summary,
            redFlags: risk.redFlags,
          }
        : null,
      summary: summary ? { analysisId: summary.analysisId, text: summary.text } : null,
    },
  };
}

async function askContractQuestion(
  args: AskContractQuestionArgs,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const contract = await contractRepository.findById(args.contractId, context.organizationId);
  if (!contract) {
    throw new Error("Contract not found in this organization");
  }

  const result = await answerContractQuestion({
    contractId: args.contractId,
    organizationId: context.organizationId,
    question: args.question,
  });

  return {
    tool: "askContractQuestion",
    data: { contractId: args.contractId, ...result },
  };
}

async function searchOrganizationBrain(
  args: SearchOrganizationBrainArgs,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const result = await answerOrganizationBrainQuestion({
    organizationId: context.organizationId,
    question: args.question,
  });

  return { tool: "searchOrganizationBrain", data: result };
}

async function searchLegalKnowledge(
  args: SearchLegalKnowledgeArgs,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const result = await answerLegalKbQuestion({
    // The asking organization, for AiCallLog cost/observability attribution
    // only - answerLegalKbQuestion never uses this to scope retrieval
    // (Legal KB has no organizationId column anywhere; "global content,
    // organization-attributed usage" per PHASE6_IMPLEMENTATION_PLAN.md
    // Section 4.3).
    organizationId: context.organizationId,
    question: args.question,
  });

  return { tool: "searchLegalKnowledge", data: result };
}

// This object's shape - each key a ToolName, each value a ToolExecuteFn -
// already satisfies ToolImplementations, so it can be passed directly to
// executePlan() (packages/shared/ai/tools/executor.ts) once the Batch 4
// assistant controller exists, with no separate assembly step.
export const assistantToolsService: ToolImplementations = {
  searchContracts,
  getContractAnalysis,
  askContractQuestion,
  searchOrganizationBrain,
  searchLegalKnowledge,
};
