import { z } from "zod";

const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_TURNS_ACCEPTED = 20;

export const askOrganizationBrainBodySchema = z.object({
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

export type AskOrganizationBrainBody = z.infer<
  typeof askOrganizationBrainBodySchema
>;
