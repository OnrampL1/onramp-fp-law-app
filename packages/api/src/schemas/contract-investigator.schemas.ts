import { z } from "zod";

const MAX_QUESTION_LENGTH = 2000;
// Generous upper bound on what a client payload may contain — the server
// still enforces its own, smaller limit (getInvestigatorHistoryTurnLimit)
// regardless of how much the client sends.
const MAX_HISTORY_TURNS_ACCEPTED = 20;

export const askInvestigatorBodySchema = z.object({
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
export type AskInvestigatorBody = z.infer<typeof askInvestigatorBodySchema>;
