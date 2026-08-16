import { z } from "zod";

const MAX_METADATA_TAGS = 5;

export const metadataSchemaV1 = z.object({
  title: z.string().nullable(),
  counterparty: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  tags: z.array(z.string()).max(MAX_METADATA_TAGS),
});

export type MetadataSchemaV1 = z.infer<typeof metadataSchemaV1>;
