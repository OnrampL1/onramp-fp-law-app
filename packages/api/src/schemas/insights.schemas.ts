import { RiskCategory } from "@prisma/client";
import { z } from "zod";

export const insightCategoryParamSchema = z.object({
  category: z.nativeEnum(RiskCategory),
});

export type InsightCategoryParam = z.infer<typeof insightCategoryParamSchema>;

// Same page/pageSize convention as listContractsQuerySchema
// (contract.schemas.ts) — this endpoint returned every matching contract
// unconditionally with no pagination at all until now.
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const insightCategoryContractsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type InsightCategoryContractsQuery = z.infer<
  typeof insightCategoryContractsQuerySchema
>;
