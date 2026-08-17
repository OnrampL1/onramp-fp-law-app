import { RiskCategory } from "@prisma/client";
import { z } from "zod";

export const insightCategoryParamSchema = z.object({
  category: z.nativeEnum(RiskCategory),
});

export type InsightCategoryParam = z.infer<typeof insightCategoryParamSchema>;
