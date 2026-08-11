import { z } from "zod";

export const summarySchemaV1 = z.object({
  text: z.string(),
});

export type SummarySchemaV1 = z.infer<typeof summarySchemaV1>;
