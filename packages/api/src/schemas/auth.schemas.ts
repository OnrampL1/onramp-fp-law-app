import { z } from "zod";

const passwordPolicySchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const acceptInvitationSchema = z.object({
  invitationToken: z.string().min(1, "Invitation token is required"),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  password: passwordPolicySchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordPolicySchema,
    confirmNewPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Password confirmation does not match",
    path: ["confirmNewPassword"],
  });
