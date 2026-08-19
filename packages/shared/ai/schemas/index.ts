import type { ZodTypeAny } from "zod";
import { testSchemaV1 } from "./test/v1";
import { investigatorAnswerSchemaV1 } from "./investigator/v1";
import { legalKbAnswerSchemaV1 } from "./legal-kb/v1";
import { summarySchemaV1 } from "./summary/v1";
import { riskSchemaV1 } from "./risk/v1";
import { riskSchemaV2 } from "./risk/v2";
import { riskSchemaV3 } from "./risk/v3";
import { metadataSchemaV1 } from "./metadata/v1";
import { assistantPlanSchemaV1 } from "./assistant-plan/v1";
import { assistantAnswerSchemaV1 } from "./assistant-answer/v1";

const SCHEMAS: Record<string, Record<string, ZodTypeAny>> = {
  test: { v1: testSchemaV1 },
  investigator: { v1: investigatorAnswerSchemaV1 },
  "legal-kb": { v1: legalKbAnswerSchemaV1 },
  summary: { v1: summarySchemaV1 },
  risk: { v1: riskSchemaV1, v2: riskSchemaV2, v3: riskSchemaV3 },
  metadata: { v1: metadataSchemaV1 },
  "assistant-plan": { v1: assistantPlanSchemaV1 },
  "assistant-answer": { v1: assistantAnswerSchemaV1 },
};

export function getSchema(schemaId: string, version: string): ZodTypeAny {
  const schema = SCHEMAS[schemaId]?.[version];
  if (!schema) {
    throw new Error(`No schema registered for ${schemaId} version ${version}`);
  }
  return schema;
}

export * from "./test/v1";
export * from "./investigator/v1";
export * from "./legal-kb/v1";
export * from "./risk/v1";
export * from "./risk/v2";
export * from "./risk/v3";
export * from "./summary/v1";
export * from "./validate";
export * from "./metadata/v1";
export * from "./assistant-plan/v1";
export * from "./assistant-answer/v1";
