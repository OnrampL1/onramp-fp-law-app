import { loadPrompt, type PromptFile } from "../prompts";
import { getSchema } from "../schemas";
import type { ZodTypeAny } from "zod";

const ACTIVE_PROMPT_VERSIONS: Record<string, string> = {
  test: "v1",
  investigator: "v1",
  "organization-brain-ask": "v1",
  "legal-kb-ask": "v1",
  summary: "v1",
  risk: "v2",
  metadata: "v1",
};

const ACTIVE_SCHEMA_VERSIONS: Record<string, string> = {
  test: "v1",
  investigator: "v1",
  "legal-kb": "v1",
  summary: "v1",
  risk: "v2",
  metadata: "v1",
};

export function getActivePromptVersion(promptId: string): string {
  const version = ACTIVE_PROMPT_VERSIONS[promptId];
  if (!version) {
    throw new Error(`No active prompt version registered for "${promptId}"`);
  }
  return version;
}

export function resolvePrompt(promptId: string): PromptFile {
  const version = getActivePromptVersion(promptId);
  return loadPrompt(promptId, version);
}

export function getActiveSchemaVersion(schemaId: string): string {
  const version = ACTIVE_SCHEMA_VERSIONS[schemaId];
  if (!version) {
    throw new Error(`No active schema version registered for "${schemaId}"`);
  }
  return version;
}

export interface ResolvedSchema {
  schemaId: string;
  version: string;
  schema: ZodTypeAny;
}

export function resolveSchema(schemaId: string): ResolvedSchema {
  const version = getActiveSchemaVersion(schemaId);
  return { schemaId, version, schema: getSchema(schemaId, version) };
}
