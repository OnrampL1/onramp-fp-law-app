import type { ZodTypeAny } from "zod";
import { testSchemaV1 } from "./test/v1";
import { summarySchemaV1 } from "./summary/v1";
import { riskSchemaV1 } from "./risk/v1";
import { riskSchemaV2 } from "./risk/v2";

const SCHEMAS: Record<string, Record<string, ZodTypeAny>> = {
  test: { v1: testSchemaV1 },
  summary: { v1: summarySchemaV1 },
  risk: { v1: riskSchemaV1, v2: riskSchemaV2 },
};

export function getSchema(schemaId: string, version: string): ZodTypeAny {
  const schema = SCHEMAS[schemaId]?.[version];
  if (!schema) {
    throw new Error(`No schema registered for ${schemaId} version ${version}`);
  }
  return schema;
}

export * from "./test/v1";
export * from "./risk/v1";
export * from "./risk/v2";
export * from "./summary/v1";
export * from "./validate";
