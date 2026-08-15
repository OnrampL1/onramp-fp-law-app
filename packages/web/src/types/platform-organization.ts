export type PlatformOrganizationStatus =
  | "CREATED"
  | "OWNER_ASSIGNED"
  | "ACTIVE"
  | "SUSPENDED"
  | "ARCHIVED";

export interface PlatformOrganizationOwner {
  id: string;
  email: string;
  fullName: string;
  role?: "OWNER" | "ADMIN" | "INTERNAL";
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
}

export interface PlatformOrganizationCounts {
  members: number;
  invitations: number;
  contracts: number;
  auditLogs?: number;
}

export interface PlatformOrganizationListItem {
  id: string;
  name: string;
  slug: string;
  status: PlatformOrganizationStatus;
  ownerAssignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: PlatformOrganizationOwner | null;
  counts: PlatformOrganizationCounts;
}

export interface ListPlatformOrganizationsParams {
  search?: string;
  status?: PlatformOrganizationStatus;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListPlatformOrganizationsResponse {
  data: PlatformOrganizationListItem[];
  meta: {
    pagination: PaginationMeta;
  };
}
