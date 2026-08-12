// ─── Queue names ───────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: "email",
  EMBEDDINGS: "embeddings",
  INVITATION_EXPIRY: "invitation-expiry",
  EXTRACTION: "extraction",
  AI_ANALYSIS: "ai-analysis",
  AI_ANALYSIS_AGGREGATE: "ai-analysis-aggregate",
  ORGANIZATION_BRAIN_EMBEDDINGS: "organization-brain-embeddings",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Job data shapes ───────────────────────────────────────────────────────────
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
}

export interface EmbeddingsJobData {
  contractId: string;
  organizationId: string;
}

// The sweep takes no parameters — it always expires whatever is stale as of
// "now". The (empty) data shape only exists so the queue can be typed.
export type InvitationExpiryJobData = Record<string, never>;

export interface ExtractionJobData {
  contractId: string;
  fileKey: string;
}

// ─── Job result shapes ─────────────────────────────────────────────────────────
export interface EmailJobResult {
  messageId: string;
}

export interface EmbeddingsJobResult {
  status: "COMPLETED" | "SKIPPED" | "CEILING_EXCEEDED";
  chunkCount: number;
}

export interface InvitationExpiryJobResult {
  expiredCount: number;
}

export interface ExtractionJobResult {
  status: "EXTRACTION_COMPLETED" | "EXTRACTION_FAILED";
}

export interface AIAnalysisJobData {
  contractId: string;
  organizationId: string;
  createdByUserId: string;
  analysisType: "SUMMARY" | "RISK" | "CLAUSE_QUERY";
  promptId: string;
  schemaId: string;
  extractedText: string;
}

export interface AIAnalysisJobResult {
  status: "AI_COMPLETED" | "AI_FAILED";
  errorMessage?: string;
}

// Parent job in the flow — runs once both AIAnalysisJobData children (SUMMARY,
// RISK) have settled, and writes the one aggregate Contract.processingStatus
// update. Individual analysis jobs no longer touch processingStatus directly.
export interface AIAnalysisAggregateJobData {
  contractId: string;
  organizationId: string;
}

export interface AIAnalysisAggregateJobResult {
  status: "AI_COMPLETED" | "AI_FAILED";
}

export interface OrganizationBrainEmbeddingsJobData {
  organizationBrainItemId: string;
  organizationId: string;
  storageKey: string;
}

export interface OrganizationBrainEmbeddingsJobResult {
  status: "COMPLETED" | "SKIPPED" | "CEILING_EXCEEDED" | "EXTRACTION_FAILED";
  chunkCount: number;
}

export type JobData =
  | EmailJobData
  | EmbeddingsJobData
  | InvitationExpiryJobData
  | ExtractionJobData
  | AIAnalysisJobData
  | AIAnalysisAggregateJobData
  | OrganizationBrainEmbeddingsJobData;
