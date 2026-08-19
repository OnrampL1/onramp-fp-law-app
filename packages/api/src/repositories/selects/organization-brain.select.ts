import { Prisma } from "@prisma/client";

export const ORGANIZATION_BRAIN_ITEM_LIST_SELECT = {
  id: true,
  title: true,
  type: true,
  source: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      fullName: true,
    },
  },
} satisfies Prisma.OrganizationBrainItemSelect;

export const ORGANIZATION_BRAIN_ITEM_DETAIL_SELECT = {
  id: true,
  organizationId: true,
  title: true,
  type: true,
  source: true,
  storageKey: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  checksum: true,
  extractionError: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      fullName: true,
    },
  },
} satisfies Prisma.OrganizationBrainItemSelect;
