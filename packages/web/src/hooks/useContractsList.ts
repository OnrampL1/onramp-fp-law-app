import { fetchContractList } from "../services/contract-list.service";
import { ContractListParams } from "../types/contracts";
import { LIST_REFETCH_INTERVAL_MS } from "../lib/query-config";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function useContractsList(params: ContractListParams) {
  return useQuery({
    queryKey: ["contracts", params],
    queryFn: () => fetchContractList(params),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}
