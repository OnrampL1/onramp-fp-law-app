import type { LucideIcon } from "lucide-react";
import { KeyRound, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";

type SecurityStatusRowProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: string;
};

function SecurityStatusRow({
  icon: Icon,
  title,
  description,
  status,
}: SecurityStatusRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </div>

        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <Badge variant="secondary">{status}</Badge>
    </div>
  );
}

export function SecuritySettings() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }
  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account security</CardTitle>
          <CardDescription>
            Review the security methods protecting your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="divide-y py-0">
          <SecurityStatusRow
            icon={KeyRound}
            title="Password authentication"
            description="Your account is protected with password authentication."
            status="Enabled"
          />

          <SecurityStatusRow
            icon={MonitorSmartphone}
            title="Current session"
            description="This browser has an authenticated session."
            status="Active"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access permissions</CardTitle>
          <CardDescription>
            Your assigned role determines the areas you can access.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ShieldCheck className="size-4" />
            </div>

            <div>
              <p className="text-sm font-medium">Account role</p>
              <p className="text-xs text-muted-foreground">
                Role assigned to {user.email}
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign out</CardTitle>
          <CardDescription>
            End your current session on this device.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <LogOut className="size-4" />
            </div>

            <div>
              <p className="text-sm font-medium">Current account</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full sm:w-auto"
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
