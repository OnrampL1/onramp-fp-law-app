import {
  OrganizationAccessRequestCompanySize,
  OrganizationAccessRequestStatus,
} from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const submitAccessRequestSchema = z.object({
  contactFirstName: z.string().trim().min(1).max(80),
  contactLastName: z.string().trim().min(1).max(80),
  contactEmail: z.string().trim().toLowerCase().email().max(254),

  organizationName: z.string().trim().min(2).max(120),
  websiteUrl: optionalTrimmedString(200).refine(
    (value) => {
      if (!value) return true;

      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Website must be a valid HTTP or HTTPS URL" },
  ),
  companySize: z.nativeEnum(OrganizationAccessRequestCompanySize).optional(),
  country: optionalTrimmedString(80),

  intendedUse: z.string().trim().min(10).max(1000),
  notes: optionalTrimmedString(1000),

  // Bot trap: real users never see or fill this field.
  website: z.string().max(0).optional(),
});

export type SubmitAccessRequestInput = z.infer<
  typeof submitAccessRequestSchema
>;

export const listAccessRequestsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.nativeEnum(OrganizationAccessRequestStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const accessRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListAccessRequestsQuery = z.infer<
  typeof listAccessRequestsQuerySchema
>;
