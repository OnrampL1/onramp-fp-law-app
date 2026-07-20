import { z } from "zod";
import {
  MAX_CONTRACT_COUNTERPARTY_LENGTH,
  MAX_CONTRACT_TAG_LENGTH,
  MAX_CONTRACT_TAGS,
  MAX_CONTRACT_TITLE_LENGTH,
} from "../constants/contract-upload.constants";

const contractTagSchema = z.string().trim().min(1).max(MAX_CONTRACT_TAG_LENGTH);

function parseTags(value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall back to comma-separated tags.
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export const createContractMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Contract title is required")
    .max(MAX_CONTRACT_TITLE_LENGTH),

  counterparty: z
    .string()
    .trim()
    .min(1, "Counterparty is required")
    .max(MAX_CONTRACT_COUNTERPARTY_LENGTH),

  tags: z
    .preprocess(parseTags, z.array(contractTagSchema).max(MAX_CONTRACT_TAGS))
    .default([]),

  expirationDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiration date must use YYYY-MM-DD")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : null)),

  legalState: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]).optional(),
});

export type CreateContractMetadataInput = z.infer<
  typeof createContractMetadataSchema
>;
