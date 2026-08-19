import { z } from "zod";

// Deliberately references evidence only by `id` - the same "cite by id,
// enrich by lookup afterward" shape every other corpus's answer schema
// already uses (investigatorAnswerSchemaV1's {chunkId, excerpt}), except
// here the model doesn't repeat an excerpt at all: the excerpt already
// lives in the AssistantEvidenceUnit the id resolves to
// (agents/assistant-aggregation.ts), so there is nothing for the model to
// (mis)transcribe. What's still verified is whether the id is real -
// see agents/assistant-synthesizer.ts's evidence-reference check.
export const assistantAnswerSchemaV1 = z.object({
  answer: z.string(),
  sources: z.array(z.object({ id: z.string() })),
  confidence: z.number().min(0).max(100).optional(),
});

export type AssistantAnswerV1 = z.infer<typeof assistantAnswerSchemaV1>;
