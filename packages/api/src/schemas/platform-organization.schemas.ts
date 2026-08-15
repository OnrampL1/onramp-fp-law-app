import { OrganizationStatus } from "@prisma/client";
import { z } from "zod";

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
