import type { AIAnalysisStatus, AIAnalysisType } from "@prisma/client";

export interface AIAnalysisListItemDto {
  id: string;
  type: AIAnalysisType;
  status: AIAnalysisStatus;
  promptVersion: string | null;
  schemaVersion: string | null;
  modelVersion: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export interface AIAnalysisDetailDto {
  id: string;
  contractId: string;
  type: AIAnalysisType;
  status: AIAnalysisStatus;
  promptUsed: string;
  promptVersion: string | null;
  schemaVersion: string | null;
  result: unknown;
  modelVersion: string | null;
  tokensUsed: number | null;
  createdByName: string;
  createdAt: string;
}

export interface AIAnalysisListPagination {
  page: number;
  pageSize: number;
}

export interface AIAnalysisListPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RiskFlagDto {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  description: string;
  sourceText: string;
}

export interface TimelineEntryDto {
  date: string | null;
  label: string;
  kind: "KEY_DATE" | "OBLIGATION";
  party?: string;
}

export interface RiskOverviewDto {
  analysisId: string;
  createdAt: string;
  healthScore: number;
  summary: string;
  redFlags: RiskFlagDto[];
  timeline: TimelineEntryDto[];
}

export interface SummaryOverviewDto {
  analysisId: string;
  createdAt: string;
  text: string;
}
