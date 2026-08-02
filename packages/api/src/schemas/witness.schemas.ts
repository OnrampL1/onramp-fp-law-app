import { z } from "zod";

export const createWitnessLinkSchema = z.object({
  contractId: z.string().uuid(),
  witnessEmail: z.string().email(),
  witnessName: z.string().min(1).max(100).optional(),
  // Matches WitnessLinkBody in openapi.yaml (min 1, max 720, default 72).
  expiresInHours: z.number().int().min(1).max(720).default(72),
  // Defaults to true so an omitted field still behaves like the invitation
  // flow's unconditional send; the admin can opt out to hand the link over
  // through another channel instead.
  sendEmail: z.boolean().default(true),
});

export const listWitnessLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  contractId: z.string().uuid().optional(),
});
