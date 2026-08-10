import { contractRepository } from "../repositories/contract.repository";
import { createError } from "../middleware/error-handler";
import {
  aiAnalysisRepository,
  type AIAnalysisDetailRow,
  type AIAnalysisListRow,
} from "../repositories/ai-analysis.repository";
import type {
  AIAnalysisDetailDto,
  AIAnalysisListItemDto,
  AIAnalysisListPagination,
  AIAnalysisListPaginationMeta,
  RiskOverviewDto,
  TimelineEntryDto,
} from "../types/ai-analysis.types";
import {
  enqueueContractAnalysis,
  riskSchemaV1,
  type RiskSchemaV1,
} from "@starter-kit/shared";

function toListItemDto(row: AIAnalysisListRow): AIAnalysisListItemDto {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    promptVersion: row.promptVersion,
    schemaVersion: row.schemaVersion,
    modelVersion: row.modelVersion,
    tokensUsed: row.tokensUsed,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDetailDto(row: AIAnalysisDetailRow): AIAnalysisDetailDto {
  return {
    id: row.id,
    contractId: row.contractId,
    type: row.type,
    status: row.status,
    promptUsed: row.promptUsed,
    promptVersion: row.promptVersion,
    schemaVersion: row.schemaVersion,
    result: row.result,
    modelVersion: row.modelVersion,
    tokensUsed: row.tokensUsed,
    createdByName: row.createdBy.fullName,
    createdAt: row.createdAt.toISOString(),
  };
}

async function listAnalyses(
  contractId: string,
  organizationId: string,
  pagination: AIAnalysisListPagination,
): Promise<{
  items: AIAnalysisListItemDto[];
  pagination: AIAnalysisListPaginationMeta;
}> {
  const [rows, total] = await Promise.all([
    aiAnalysisRepository.findMany(contractId, organizationId, pagination),
    aiAnalysisRepository.count(contractId, organizationId),
  ]);

  return {
    items: rows.map(toListItemDto),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

async function getAnalysisById(
  id: string,
  contractId: string,
  organizationId: string,
): Promise<AIAnalysisDetailDto> {
  const analysis = await aiAnalysisRepository.findById(
    id,
    contractId,
    organizationId,
  );

  if (!analysis) {
    throw createError("AI analysis not found", 404);
  }

  return toDetailDto(analysis);
}

async function triggerAnalysis(
  contractId: string,
  organizationId: string,
  createdByUserId: string,
): Promise<void> {
  const contract = await contractRepository.findContentById(
    contractId,
    organizationId,
  );

  if (!contract) {
    throw createError("Contract not found", 404);
  }

  if (!contract.extractedText) {
    throw createError(
      "Contract has no extracted text yet - analysis cannot run until extraction completes",
      409,
    );
  }

  await enqueueContractAnalysis({
    contractId,
    organizationId,
    createdByUserId,
    extractedText: contract.extractedText,
  });
}

const SEVERITY_ORDER: Record<
  RiskSchemaV1["flags"][number]["severity"],
  number
> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function getRiskSchemaForVersion(version: string) {
  switch (version) {
    case "v1":
      return riskSchemaV1;
    default:
      throw createError(`Unsupported risk schema version: "${version}"`, 500);
  }
}

function buildTimeline(risk: RiskSchemaV1): TimelineEntryDto[] {
  const fromKeyDates: TimelineEntryDto[] = risk.keyDates.map((kd) => ({
    date: kd.date,
    label: kd.label,
    kind: "KEY_DATE",
  }));

  const fromObligations: TimelineEntryDto[] = risk.obligations.map((ob) => ({
    date: ob.dueDate,
    label: ob.description,
    kind: "OBLIGATION",
    party: ob.party,
  }));

  return [...fromKeyDates, ...fromObligations].sort((a, b) => {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date.localeCompare(b.date);
  });
}

async function getRiskOverview(
  contractId: string,
  organizationId: string,
): Promise<RiskOverviewDto> {
  const analysis = await aiAnalysisRepository.findLatestByType(
    contractId,
    organizationId,
    "RISK",
  );

  if (!analysis) {
    throw createError(
      "No completed risk analysis found for this contract",
      404,
    );
  }

  if (!analysis.schemaVersion) {
    throw createError("Risk analysis has no recorded schema version", 500);
  }

  const schema = getRiskSchemaForVersion(analysis.schemaVersion);
  const parsed = schema.safeParse(analysis.result);

  if (!parsed.success) {
    throw createError(
      "Stored risk analysis does not match its recorded schema",
      500,
    );
  }

  const risk = parsed.data;

  return {
    analysisId: analysis.id,
    createdAt: analysis.createdAt.toISOString(),
    healthScore: 100 - risk.overallScore,
    summary: risk.summary,
    redFlags: [...risk.flags].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    ),
    timeline: buildTimeline(risk),
  };
}

export const aiAnalysisService = {
  listAnalyses,
  getAnalysisById,
  triggerAnalysis,
  getRiskOverview,
};
