import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, KeyRound, Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useChangePassword } from "@/hooks/useSettings";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ProfileSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  if (!user) {
    return null;
  }

  async function onSubmit(data: PasswordFormData) {
    try {
      setSuccessMessage(null);
      await changePassword.mutateAsync(data);
      reset();
      setSuccessMessage("Password changed successfully. Please sign in again.");
      await logout().catch(() => undefined);
      navigate("/login", { replace: true });
    } catch {
      setSuccessMessage(null);
    }
  }

  const isPending = isSubmitting || changePassword.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
          <CardDescription>
            Name and email changes are outside this MVP and require a separate
            identity review.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="font-medium">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" value={user.fullName} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email address</Label>
              <Input
                id="profile-email"
                type="email"
                value={user.email}
                readOnly
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>
            Change the password used to sign in to your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isPending}
                  {...register("currentPassword")}
                />
                {errors.currentPassword && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...register("confirmNewPassword")}
                />
                {errors.confirmNewPassword && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
            </div>

            {changePassword.isError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4" />
                Unable to change password. Check your current password and try
                again.
              </p>
            )}

            {successMessage && (
              <p className="text-sm text-muted-foreground">{successMessage}</p>
            )}

            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isPending ? "Changing password..." : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account access</CardTitle>
          <CardDescription>
            Review the access level assigned to your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Assigned role</p>
            <p className="text-xs text-muted-foreground">
              Your role controls which workspace features you can access.
            </p>
          </div>

          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
