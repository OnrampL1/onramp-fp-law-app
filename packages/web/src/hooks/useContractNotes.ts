import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchContractNotes,
  createContractNote,
  updateContractNote,
  deleteContractNote,
} from "../services/contract-note.service";

export function useContractNotes(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract", contractId, "notes"],
    queryFn: () => fetchContractNotes(contractId as string),
    enabled: Boolean(contractId),
  });
}

export function useCreateContractNote(contractId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      createContractNote(contractId as string, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "notes"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "timeline"],
      });
    },
  });
}

export function useUpdateContractNote(contractId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      updateContractNote(contractId as string, noteId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "notes"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "timeline"],
      });
    },
  });
}

export function useDeleteContractNote(contractId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      deleteContractNote(contractId as string, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "notes"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "timeline"],
      });
    },
  });
}
