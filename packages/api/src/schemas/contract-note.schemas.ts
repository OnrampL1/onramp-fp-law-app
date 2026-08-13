import { z } from "zod";

const MAX_NOTE_LENGTH = 5000;

export const createContractNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Note content is required")
    .max(MAX_NOTE_LENGTH),
});
export type CreateContractNoteInput = z.infer<typeof createContractNoteSchema>;

export const updateContractNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Note content is required")
    .max(MAX_NOTE_LENGTH),
});
export type UpdateContractNoteInput = z.infer<typeof updateContractNoteSchema>;

export const contractNoteIdParamSchema = z.object({
  id: z.string().uuid("Invalid contract id"),
  noteId: z.string().uuid("Invalid note id"),
});
export type ContractNoteIdParam = z.infer<typeof contractNoteIdParamSchema>;

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export const listContractNotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});
export type ListContractNotesQuery = z.infer<
  typeof listContractNotesQuerySchema
>;
