import { useMutation } from "@tanstack/react-query";
import { askAssistant } from "../services/assistant-ask.service";

export function useAskAssistant() {
  return useMutation({ mutationFn: askAssistant });
}
