import { z } from "zod";

export const acceptInvitationSchema = z.object({
  invitationToken: z.string().min(1, "Invitation token is required"),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
