import { z } from "zod";

// Same response shape as investigatorAnswerSchemaV1 today, registered under
// its own schemaId ("legal-kb", not "investigator") rather than reused —
// deliberate, so this corpus's response contract can evolve independently
// (e.g. a future articleReferences field) without touching Contracts/
// Organization Brain's shared schema.
export const legalKbAnswerSchemaV1 = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      chunkId: z.string().uuid(),
      excerpt: z.string(),
    }),
  ),
  confidence: z.number().min(0).max(100).optional(),
});

export type LegalKbAnswerV1 = z.infer<typeof legalKbAnswerSchemaV1>;
