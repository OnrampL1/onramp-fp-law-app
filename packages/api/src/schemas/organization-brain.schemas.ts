import { OrganizationBrainItemType } from "@prisma/client";
import { z } from "zod";
import {
  MAX_ORGANIZATION_BRAIN_PASTE_CONTENT_LENGTH,
  MAX_ORGANIZATION_BRAIN_SEARCH_LENGTH,
  MAX_ORGANIZATION_BRAIN_TITLE_LENGTH,
} from "../constants/organization-brain.constants";

const organizationBrainTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(MAX_ORGANIZATION_BRAIN_TITLE_LENGTH);

export const organizationBrainItemIdParamSchema = z.object({
  id: z.string().uuid("Invalid organization brain item id"),
});

export type OrganizationBrainItemIdParam = z.infer<
  typeof organizationBrainItemIdParamSchema
>;

export const listOrganizationBrainItemsQuerySchema = z.object({
  type: z.nativeEnum(OrganizationBrainItemType).optional(),
  search: z
    .string()
    .trim()
    .min(1)
    .max(MAX_ORGANIZATION_BRAIN_SEARCH_LENGTH)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListOrganizationBrainItemsQuery = z.infer<
  typeof listOrganizationBrainItemsQuerySchema
>;

export const createOrganizationBrainUploadSchema = z
  .object({
    title: organizationBrainTitleSchema,
    type: z.nativeEnum(OrganizationBrainItemType),
  })
  .strict();

export type CreateOrganizationBrainUploadInput = z.infer<
  typeof createOrganizationBrainUploadSchema
>;

export const createOrganizationBrainPasteSchema = z
  .object({
    title: organizationBrainTitleSchema,
    type: z.nativeEnum(OrganizationBrainItemType),
    content: z
      .string()
      .min(1, "Content is required")
      .max(MAX_ORGANIZATION_BRAIN_PASTE_CONTENT_LENGTH)
      .refine((value) => value.trim().length > 0, {
        message: "Content is required",
      }),
  })
  .strict();

export type CreateOrganizationBrainPasteInput = z.infer<
  typeof createOrganizationBrainPasteSchema
>;
