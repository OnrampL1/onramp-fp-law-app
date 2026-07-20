import { ContractLegalState } from "@prisma/client";
import z from "zod";

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
