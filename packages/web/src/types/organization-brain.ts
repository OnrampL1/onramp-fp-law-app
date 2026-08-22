export type OrganizationBrainItemType =
  | "TEMPLATE"
  | "POLICY"
  | "CLAUSE"
  | "GUIDELINE";

export type OrganizationBrainItemSource = "UPLOAD" | "PASTE";

export const organizationBrainItemTypeLabels: Record<
  OrganizationBrainItemType,
  string
> = {
  TEMPLATE: "Template",
  POLICY: "Policy",
  CLAUSE: "Clause",
  GUIDELINE: "Guideline",
};

export const organizationBrainItemSourceLabels: Record<
  OrganizationBrainItemSource,
  string
> = {
  UPLOAD: "Uploaded file",
  PASTE: "Pasted text",
};

export interface OrganizationBrainItem {
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

export interface OrganizationBrainPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OrganizationBrainListParams {
  type?: OrganizationBrainItemType;
  search?: string;
  page: number;
  pageSize: number;
}

export interface OrganizationBrainListResult {
  items: OrganizationBrainItem[];
  pagination: OrganizationBrainPaginationMeta;
}

export interface CreateOrganizationBrainPastePayload {
  title: string;
  type: OrganizationBrainItemType;
  content: string;
}

export interface CreateOrganizationBrainUploadPayload {
  title: string;
  type: OrganizationBrainItemType;
  file: File;
}
