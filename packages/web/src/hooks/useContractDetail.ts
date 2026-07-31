import {
  fetchContractContent,
  fetchContractDetail,
} from "../services/contract-detail.service";
import { useQuery } from "@tanstack/react-query";

export function useContractDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: () => fetchContractDetail(id as string),
    enabled: Boolean(id),
  });
}

export function useContractContent(id: string | undefined) {
  return useQuery({
    queryKey: ["contract", id, "content"],
    queryFn: () => fetchContractContent(id as string),
    enabled: Boolean(id),
  });
}
