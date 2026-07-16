import { z } from "zod";

// OWNER is deliberately excluded — ownership changes go through the
// dedicated ownership-transfer flow, not a generic role update.
export const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "INTERNAL"], {
    errorMap: () => ({ message: "Role must be one of: ADMIN, INTERNAL" }),
  }),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"], {
    errorMap: () => ({ message: "Status must be one of: ACTIVE, SUSPENDED" }),
  }),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
