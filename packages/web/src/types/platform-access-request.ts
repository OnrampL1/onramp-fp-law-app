import type {
  PlatformOrganizationStatus,
  PaginationMeta,
} from "./platform-organization";

export type PlatformAccessRequestStatus = "PENDING" | "APPROVED" | "DECLINED";

export type PlatformAccessRequestCompanySize =
  | "ONE_TO_TEN"
  | "ELEVEN_TO_FIFTY"
  | "FIFTY_ONE_TO_TWO_HUNDRED"
  | "TWO_HUNDRED_ONE_TO_ONE_THOUSAND"
  | "ONE_THOUSAND_PLUS";

export interface PlatformAccessRequestReviewer {
  id: string;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "SUPPORT_ENGINEER";
}

export interface PlatformAccessRequestOrganization {
  id: string;
  name: string;
  slug: string;
  status: PlatformOrganizationStatus;
}

export interface PlatformAccessRequest {
  id: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  organizationName: string;
  websiteUrl: string | null;
  companySize: PlatformAccessRequestCompanySize | null;
  country: string | null;
  intendedUse: string;
  notes: string | null;
  status: PlatformAccessRequestStatus;
  reviewedAt: string | null;
  declineReason: string | null;
  organization: PlatformAccessRequestOrganization | null;
  reviewedByPlatformUser: PlatformAccessRequestReviewer | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListPlatformAccessRequestsParams {
  search?: string;
  status?: PlatformAccessRequestStatus;
  page?: number;
  limit?: number;
}

export interface ListPlatformAccessRequestsResponse {
  data: PlatformAccessRequest[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface ApprovePlatformAccessRequestPayload {
  name: string;
  slug: string;
  timezone: string;
  language: string;
}

export interface DeclinePlatformAccessRequestPayload {
  declineReason?: string;
}
