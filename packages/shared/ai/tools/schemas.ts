import { ContractLegalState } from "@prisma/client";
import { z } from "zod";

// Same convention as askInvestigatorBodySchema
// (packages/api/src/schemas/contract-investigator.schemas.ts) - kept in
// sync by value, not by import, since that file lives in packages/api and
// this one must not depend on it (packages/shared has no dependency on
// packages/api, only the reverse).
const MAX_QUESTION_LENGTH = 2000;

// None of the five schemas below accept an organizationId, userId, or any
// tenant identifier field, anywhere, under any name - that is the concrete
// mechanism behind "the LLM must never provide an organization ID"
// (Phase 7 plan). The server injects ToolExecutionContext.organizationId
// itself when executing a step; there is no argument the model could set
// to override or spoof it.

export const searchContractsArgsSchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  legalState: z.nativeEnum(ContractLegalState).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  expirationBucket: z
    .enum(["expiring_30", "expiring_90", "expired", "none"])
    .optional(),
});
export type SearchContractsArgs = z.infer<typeof searchContractsArgsSchema>;

export const getContractAnalysisArgsSchema = z.object({
  contractId: z.string().uuid(),
});
export type GetContractAnalysisArgs = z.infer<
  typeof getContractAnalysisArgsSchema
>;

export const askContractQuestionArgsSchema = z.object({
  contractId: z.string().uuid(),
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});
export type AskContractQuestionArgs = z.infer<
  typeof askContractQuestionArgsSchema
>;

export const searchOrganizationBrainArgsSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});
export type SearchOrganizationBrainArgs = z.infer<
  typeof searchOrganizationBrainArgsSchema
>;

export const searchLegalKnowledgeArgsSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});
export type SearchLegalKnowledgeArgs = z.infer<
  typeof searchLegalKnowledgeArgsSchema
>;
