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
} from "../types/ai-analysis.types";

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

export const aiAnalysisService = {
  listAnalyses,
  getAnalysisById,
};
