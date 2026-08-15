import { OrganizationStatus } from "@prisma/client";
import { z } from "zod";
import { passwordPolicySchema } from "./auth.schemas";

export const listPlatformOrganizationsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.nativeEnum(OrganizationStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const platformOrganizationParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListPlatformOrganizationsQuery = z.infer<
  typeof listPlatformOrganizationsQuerySchema
>;

export const createPlatformOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        "Slug must use lowercase letters, numbers, and single hyphens between words",
    }),
  timezone: z.string().trim().min(1).max(100).default("UTC"),
  language: z.string().trim().min(2).max(10).default("en"),
});

export type CreatePlatformOrganizationInput = z.infer<
  typeof createPlatformOrganizationSchema
>;

export const assignPlatformOrganizationOwnerSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  fullName: z.string().trim().min(2).max(100),
  password: passwordPolicySchema,
});

export type AssignPlatformOrganizationOwnerInput = z.infer<
  typeof assignPlatformOrganizationOwnerSchema
>;
