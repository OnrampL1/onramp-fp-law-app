export interface AskHistoryTurn {
  question: string;
  answer: string;
}

// Mirrors packages/api/src/types/assistant.types.ts's AssistantSourceDto -
// deliberately flatter than the old per-corpus OrgBrainSource/LegalKbSource
// shapes this file used to define (no instrumentTitle/gazette/authority
// fields): `capability` and `label` already carry what a source card needs
// to be legible, and the Assistant's own tool name isn't exposed to the
// frontend at all.
export interface AssistantSource {
  id: string;
  capability: string;
  label: string;
  excerpt: string;
  contractId?: string;
}

export interface AskAssistantPayload {
  question: string;
  history?: AskHistoryTurn[];
}

export interface AskAssistantResponse {
  answer: string;
  sources: AssistantSource[];
  confidence?: number;
}
