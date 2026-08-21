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

export const onboardingNotificationPreferencesSchema = z
  .object({
    contractUpdates: z.boolean().optional(),
    riskAlerts: z.boolean().optional(),
    aiInsights: z.boolean().optional(),
  })
  .strict();

export const completeOrganizationOnboardingSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    timezone: z
      .string()
      .trim()
      .min(1)
      .refine(isValidTimeZone, "Timezone must be a valid IANA timezone"),
    language: z.enum(supportedLanguages),
    notificationPreferences: onboardingNotificationPreferencesSchema.optional(),
  })
  .strict();

export type CompleteOrganizationOnboardingInput = z.infer<
  typeof completeOrganizationOnboardingSchema
>;
