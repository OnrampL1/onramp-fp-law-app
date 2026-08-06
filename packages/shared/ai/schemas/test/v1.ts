import { z } from "zod";

export const testSchemaV1 = z.object({
  answer: z.string(),
});

export type TestSchemaV1 = z.infer<typeof testSchemaV1>;
