import { z } from "zod";

// Same convention and limits as askInvestigatorBodySchema /
// askOrganizationBrainBodySchema / askLegalKbBodySchema - the Assistant's
// own request shape isn't a new convention, just the same one applied one
// level up.
const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_TURNS_ACCEPTED = 20;

export const askAssistantBodySchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  history: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
        answer: z.string().trim().min(1),
      }),
    )
    .max(MAX_HISTORY_TURNS_ACCEPTED)
    .optional(),
});

export type AskAssistantBody = z.infer<typeof askAssistantBodySchema>;
