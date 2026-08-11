import { z } from "zod";

const riskFlagSchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  category: z.string(),
  description: z.string(),
  sourceText: z.string(),
});

const obligationSchema = z.object({
  party: z.string(),
  description: z.string(),
  dueDate: z.string().nullable(),
});

const keyDateSchema = z.object({
  label: z.string(),
  date: z.string(),
});

export const riskSchemaV1 = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  flags: z.array(riskFlagSchema),
  obligations: z.array(obligationSchema),
  keyDates: z.array(keyDateSchema),
});

export type RiskSchemaV1 = z.infer<typeof riskSchemaV1>;
