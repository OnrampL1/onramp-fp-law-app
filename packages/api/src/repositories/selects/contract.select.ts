import { Prisma } from "@prisma/client";

export const CONTRACT_LIST_SELECT = {
  id: true,
  title: true,
  counterparty: true,
  legalState: true,
  tags: true,
  effectiveDate: true,
  expirationDate: true,
  updatedAt: true,
} satisfies Prisma.ContractSelect;

export const CONTRACT_DETAIL_SELECT = {
  id: true,
  title: true,
  counterparty: true,
  businessStatus: true,
  processingStatus: true,
  processingError: true,
  legalState: true,
  tags: true,
  effectiveDate: true,
  expirationDate: true,
  fileKey: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: {
    select: {
      fullName: true,
    },
  },
} satisfies Prisma.ContractSelect;

export const CONTRACT_CONTENT_SELECT = {
  processingStatus: true,
  extractedText: true,
  version: true,
} satisfies Prisma.ContractSelect;

// What an external Witness may see for their one scoped contract (BR-8).
// Deliberately excludes organizationId/uploadedByUserId (internal identity),
// version/deletedAt (internal bookkeeping), and never lists notes/aiAnalyses
// — those relations simply never appear here, so there's no relation to
// forget to strip later. fileKey is included only to generate a presigned
// download URL server-side; it is never put on the response DTO itself.
export const WITNESS_CONTRACT_SELECT = {
  id: true,
  title: true,
  counterparty: true,
  businessStatus: true,
  legalState: true,
  tags: true,
  effectiveDate: true,
  expirationDate: true,
  processingStatus: true,
  processingError: true,
  extractedText: true,
  fileKey: true,
} satisfies Prisma.ContractSelect;
