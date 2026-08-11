import { useMutation } from "@tanstack/react-query";
import { askInvestigator } from "../services/contract-investigator.service";
import type { AskInvestigatorPayload } from "../types/investigator";

export function useAskInvestigator(contractId: string | undefined) {
  return useMutation({
    mutationFn: (payload: AskInvestigatorPayload) =>
      askInvestigator(contractId as string, payload),
  });
}
