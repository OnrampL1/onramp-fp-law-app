import { useMutation } from "@tanstack/react-query";
import { askOrganizationBrain } from "../services/organization-brain-ask.service";
import { askLegalKb } from "../services/legal-kb-ask.service";

export function useAskOrganizationBrain() {
  return useMutation({ mutationFn: askOrganizationBrain });
}

export function useAskLegalKb() {
  return useMutation({ mutationFn: askLegalKb });
}
