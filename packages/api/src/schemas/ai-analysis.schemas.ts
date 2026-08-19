import { z } from "zod";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const listAIAnalysesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});
export type ListAIAnalysesQuery = z.infer<typeof listAIAnalysesQuerySchema>;

export const aiAnalysisIdParamSchema = z.object({
  id: z.string().uuid("Invalid contract id"),
  analysisId: z.string().uuid("Invalid analysis id"),
});
export type AIAnalysisIdParam = z.infer<typeof aiAnalysisIdParamSchema>;
