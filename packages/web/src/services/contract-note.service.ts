import { apiClient } from "@/lib/api-client";
import type {
  ContractNoteDto,
  ContractNoteListResult,
} from "@/types/contract-note";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchContractNotes(
  contractId: string,
): Promise<ContractNoteListResult> {
  const response = await apiClient.get<ApiEnvelope<ContractNoteListResult>>(
    `/contracts/${contractId}/notes`,
    { params: { pageSize: 100 } },
  );
  return response.data.data;
}

export async function createContractNote(
  contractId: string,
  content: string,
): Promise<ContractNoteDto> {
  const response = await apiClient.post<ApiEnvelope<ContractNoteDto>>(
    `/contracts/${contractId}/notes`,
    { content },
  );
  return response.data.data;
}

export async function updateContractNote(
  contractId: string,
  noteId: string,
  content: string,
): Promise<ContractNoteDto> {
  const response = await apiClient.put<ApiEnvelope<ContractNoteDto>>(
    `/contracts/${contractId}/notes/${noteId}`,
    { content },
  );
  return response.data.data;
}

export async function deleteContractNote(
  contractId: string,
  noteId: string,
): Promise<void> {
  await apiClient.delete(`/contracts/${contractId}/notes/${noteId}`);
}
