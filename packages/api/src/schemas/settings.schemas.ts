import { z } from "zod";

const supportedLanguages = ["en", "fr", "ar"] as const;

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const notificationPreferencesSchema = z
  .object({
    contractUpdates: z.boolean().optional(),
    riskAlerts: z.boolean().optional(),
    aiInsights: z.boolean().optional(),
  })
  .strict();

export const updateOrganizationSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .refine(isValidTimeZone, "Timezone must be a valid IANA timezone")
      .optional(),
    language: z.enum(supportedLanguages).optional(),
    logoUrl: z.string().trim().url().max(2048).nullable().optional(),
    notificationPreferences: notificationPreferencesSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one supported setting is required",
  });

export type UpdateOrganizationSettingsInput = z.infer<
  typeof updateOrganizationSettingsSchema
>;
