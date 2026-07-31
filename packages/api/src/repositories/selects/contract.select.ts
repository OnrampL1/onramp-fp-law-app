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
} satisfies Prisma.ContractSelect;
