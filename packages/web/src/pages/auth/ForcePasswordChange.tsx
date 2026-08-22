import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useChangePassword } from "@/hooks/useSettings";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Temporary password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmNewPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Password confirmation does not match",
    path: ["confirmNewPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export function ForcePasswordChange() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  async function onSubmit(data: PasswordFormData) {
    try {
      setSubmitError(null);
      await changePassword.mutateAsync(data);
      await logout().catch(() => undefined);
      navigate("/login", { replace: true });
    } catch {
      setSubmitError(
        "Unable to set your password. Check your temporary password and try again.",
      );
    }
  }

  const isPending = isSubmitting || changePassword.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          {user
            ? `Welcome, ${user.fullName}. `
            : ""}
          For your security, set a new password before continuing to your
          organization's onboarding.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {submitError && (
            <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {submitError}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Temporary password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              {...register("confirmNewPassword")}
            />
            {errors.confirmNewPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmNewPassword.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Setting password…" : "Set password and continue"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
