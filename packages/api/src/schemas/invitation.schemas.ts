import { z } from "zod";

// OWNER is deliberately excluded — see user.schemas.ts.
export const createInvitationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(["ADMIN", "INTERNAL"], {
    errorMap: () => ({ message: "Role must be one of: ADMIN, INTERNAL" }),
  }),
});

export const listInvitationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
