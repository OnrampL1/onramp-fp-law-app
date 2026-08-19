// Deliberately flatter than AssistantSource (packages/shared/ai/agents/
// assistant-synthesizer.ts): drops `tool` (the internal tool name isn't
// meaningful to a user - `capability` already is the presentable label)
// so nothing beyond what a source card needs to render is sent to the
// frontend. Not exposing toolsUsed/toolsFailed here either - which
// capabilities ran or failed is already communicated in the answer's own
// prose (the synthesis prompt is instructed to say so directly) rather
// than as a second, separate field the frontend has to reconcile against.
export interface AssistantSourceDto {
  id: string;
  capability: string;
  label: string;
  excerpt: string;
  contractId?: string;
}

export interface AskAssistantResponseDto {
  answer: string;
  sources: AssistantSourceDto[];
  confidence?: number;
}
