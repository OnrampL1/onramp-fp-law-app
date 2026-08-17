import { apiClient } from "../lib/api-client";
import type { SelectedContractFile } from "../types/contracts";

export interface UploadContractRequest {
  selectedFile: SelectedContractFile;
  signal?: AbortSignal;
}

export interface UploadContractResponse {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: "DRAFT" | "UNDER_REVIEW" | "COMPLETED" | "ARCHIVED";
  processingStatus:
    | "PENDING_EXTRACTION"
    | "EXTRACTION_COMPLETED"
    | "AI_PENDING"
    | "AI_COMPLETED"
    | "FAILED";
  legalState: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED" | null;
  tags: string[];
  expirationDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export async function uploadContractFile({
  selectedFile,
  signal,
}: UploadContractRequest): Promise<UploadContractResponse> {
  const formData = new FormData();

  formData.append("file", selectedFile.file);

  const response = await apiClient.post<{ data: UploadContractResponse }>(
    "/contracts",
    formData,
    {
      signal,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data.data;
}
