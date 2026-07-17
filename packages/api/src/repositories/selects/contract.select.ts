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
