import type {
  OrganizationBrainItemSource,
  OrganizationBrainItemType,
} from "@prisma/client";

export interface OrganizationBrainItemListFilters {
  type?: OrganizationBrainItemType;
  search?: string;
}

export interface OrganizationBrainItemListPagination {
  page: number;
  pageSize: number;
}

export interface OrganizationBrainItemListItemDto {
  id: string;
  title: string;
  type: OrganizationBrainItemType;
  source: OrganizationBrainItemSource;
  fileName: string | null;
  mimeType: string;
  sizeBytes: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationBrainItemDetailDto extends OrganizationBrainItemListItemDto {
  extractionError: string | null;
  downloadUrl: string;
  downloadUrlExpiresInSeconds: number;
}

export interface OrganizationBrainItemCreateResultDto extends OrganizationBrainItemListItemDto {}

export interface OrganizationBrainItemListPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
