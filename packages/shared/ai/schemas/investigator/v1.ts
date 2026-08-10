import { z } from "zod";

export const investigatorAnswerSchemaV1 = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      chunkId: z.string().uuid(),
      excerpt: z.string(),
    }),
  ),
  confidence: z.number().min(0).max(100).optional(),
});

export type InvestigatorAnswerV1 = z.infer<typeof investigatorAnswerSchemaV1>;
