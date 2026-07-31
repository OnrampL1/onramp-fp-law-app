import { ContractLegalState } from "@prisma/client";
import { z } from "zod";
import {
  MAX_CONTRACT_COUNTERPARTY_LENGTH,
  MAX_CONTRACT_TAG_LENGTH,
  MAX_CONTRACT_TAGS,
  MAX_CONTRACT_TITLE_LENGTH,
} from "../constants/contract-upload.constants";

// ─── Upload ─────────────────────────────────────────────────────────────

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

  // Single source of truth: the Prisma enum, not a hand-copied string list.
  legalState: z.nativeEnum(ContractLegalState).optional(),
});

export type CreateContractMetadataInput = z.infer<
  typeof createContractMetadataSchema
>;

// ─── List ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const SORT_FIELD_MAP = {
  title: "title",
  counterparty: "counterparty",
  status: "legalState",
  effectiveDate: "effectiveDate",
  expirationDate: "expirationDate",
  updatedAt: "updatedAt",
} as const;

const PUBLIC_SORT_FIELDS = Object.keys(SORT_FIELD_MAP) as [
  keyof typeof SORT_FIELD_MAP,
  ...(keyof typeof SORT_FIELD_MAP)[],
];

export const listContractsQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    status: z.nativeEnum(ContractLegalState).optional(),
    tag: z.string().trim().min(1).optional(),
    expirationBucket: z
      .enum(["expiring_30", "expiring_90", "expired", "none"])
      .optional(),
    sortBy: z.enum(PUBLIC_SORT_FIELDS).default("updatedAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .transform((query) => ({
    filters: {
      search: query.search,
      legalState: query.status,
      tag: query.tag,
      expirationBucket: query.expirationBucket,
    },
    sort: {
      field: SORT_FIELD_MAP[query.sortBy],
      direction: query.sortDirection,
    },
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
    },
  }));

export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;

// Get by ID
export const contractIdParamSchema = z.object({
  id: z.string().uuid("Invalid contract id"),
});

export type ContractIdParam = z.infer<typeof contractIdParamSchema>;
