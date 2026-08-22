export type AIAnalysisType = "SUMMARY" | "RISK" | "CLAUSE_QUERY";
export type AIAnalysisStatus = "PENDING" | "COMPLETED" | "FAILED";

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
  model: string | null;
}

export interface SummaryOverviewDto {
  analysisId: string;
  createdAt: string;
  text: string;
}

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

export interface AIAnalysisListPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AIAnalysisListResult {
  items: AIAnalysisListItemDto[];
  pagination: AIAnalysisListPaginationMeta;
}
