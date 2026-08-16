// ─── Queue names ───────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: "email",
  EMBEDDINGS: "embeddings",
  INVITATION_EXPIRY: "invitation-expiry",
  CONTRACT_LEGAL_STATE_SWEEP: "contract-legal-state-sweep",
  EXTRACTION: "extraction",
  AI_ANALYSIS: "ai-analysis",
  AI_ANALYSIS_AGGREGATE: "ai-analysis-aggregate",
  ORGANIZATION_BRAIN_EMBEDDINGS: "organization-brain-embeddings",
  LEGAL_KB_EMBEDDINGS: "legal-kb-embeddings",
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

// Same shape as InvitationExpiryJobData — the sweep always recomputes
// against "now", it takes no parameters.
export type ContractLegalStateSweepJobData = Record<string, never>;

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

export interface ContractLegalStateSweepJobResult {
  updatedCount: number;
}

export interface ExtractionJobResult {
  status: "EXTRACTION_COMPLETED" | "EXTRACTION_FAILED";
}

export interface AIAnalysisJobData {
  contractId: string;
  organizationId: string;
  createdByUserId: string;
  analysisType: "SUMMARY" | "RISK" | "CLAUSE_QUERY" | "METADATA";
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

// One already-crawled, already-verified-clean article — the caller (an
// operator script, per Domain Review item 7) must have already run
// crawlLegalSource() + assertCleanCrawl() before enqueueing; this job takes
// the resulting article data as-is and does not re-verify crawl cleanliness
// or re-fetch anything from the source site itself. amendmentEffectiveDate
// stays a "DD/MM/YYYY" string here (the crawler's own output shape,
// LegalChunk.amendmentEffectiveDate's DateTime column is populated by the
// job, not this input).
// articleNumber is a string, not a bare integer: LegalChunk.articleNumber
// is itself String? (an opaque label, not a numeric column), and flat-view
// sources (Labour Law) have real sub-numbered articles like "12-1" and
// "35-مكرر" that no numeric type could represent — found when wiring Labour
// Law through this pipeline for the first time, tree-view sources still
// just pass their plain integer as a string unchanged.
export interface LegalKbArticleInput {
  articleNumber: string;
  headingPath: string | null;
  text: string;
  amendingInstrument: string | null;
  amendmentEffectiveDate: string | null;
  isEnactmentClause: boolean;
}

export interface LegalKbEmbeddingsJobData {
  legalSourceId: string;
  articles: LegalKbArticleInput[];
}

export interface LegalKbEmbeddingsJobResult {
  status: "COMPLETED" | "CEILING_EXCEEDED";
  chunkCount: number;
}

export type JobData =
  | EmailJobData
  | EmbeddingsJobData
  | InvitationExpiryJobData
  | ContractLegalStateSweepJobData
  | ExtractionJobData
  | AIAnalysisJobData
  | AIAnalysisAggregateJobData
  | OrganizationBrainEmbeddingsJobData
  | LegalKbEmbeddingsJobData;
