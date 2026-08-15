import type { ZodTypeAny } from "zod";
import { testSchemaV1 } from "./test/v1";
import { investigatorAnswerSchemaV1 } from "./investigator/v1";
import { summarySchemaV1 } from "./summary/v1";
import { riskSchemaV1 } from "./risk/v1";
import { riskSchemaV2 } from "./risk/v2";
import { metadataSchemaV1 } from "./metadata/v1";

const SCHEMAS: Record<string, Record<string, ZodTypeAny>> = {
  test: { v1: testSchemaV1 },
  investigator: { v1: investigatorAnswerSchemaV1 },
  summary: { v1: summarySchemaV1 },
  risk: { v1: riskSchemaV1, v2: riskSchemaV2 },
  metadata: { v1: metadataSchemaV1 },
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
export * from "./risk/v1";
export * from "./risk/v2";
export * from "./summary/v1";
export * from "./validate";
export * from "./metadata/v1";
