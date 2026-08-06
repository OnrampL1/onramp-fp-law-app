import { Prisma } from "@prisma/client";

export const AI_ANALYSIS_LIST_SELECT = {
  id: true,
  type: true,
  status: true,
  promptVersion: true,
  schemaVersion: true,
  modelVersion: true,
  tokensUsed: true,
  createdAt: true,
} satisfies Prisma.AIAnalysisSelect;

export const AI_ANALYSIS_DETAIL_SELECT = {
  id: true,
  contractId: true,
  type: true,
  status: true,
  promptUsed: true,
  promptVersion: true,
  schemaVersion: true,
  result: true,
  modelVersion: true,
  tokensUsed: true,
  createdAt: true,
  createdBy: {
    select: { fullName: true },
  },
} satisfies Prisma.AIAnalysisSelect;
