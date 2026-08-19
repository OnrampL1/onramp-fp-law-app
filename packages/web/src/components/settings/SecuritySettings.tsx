import type { LucideIcon } from "lucide-react";
import { KeyRound, MonitorSmartphone, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const { user } = useAuth();

  if (!user) {
    return null;
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
    </div>
  );
}
