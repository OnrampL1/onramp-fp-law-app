// Shared types for the AI platform. Extended as providers, prompts, and
// schemas are built — this file defines the contracts those layers
// implement, not the implementations themselves.

export type AiProviderName = "openrouter";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptId: string;
  promptVersion?: string;
  schemaId?: string;
  schemaVersion?: string;
  organizationId: string;
}

export interface AiCompletionResult {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  callLogId: string;
}

export type AiCallStatus = "SUCCESS" | "VALIDATION_FAILED" | "PROVIDER_ERROR";
