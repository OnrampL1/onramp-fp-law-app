import type { LucideIcon } from "lucide-react";
import { BellRing, Clock, FileCheck2, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/useSettings";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotifications";
import type { NotificationPreferences as OrgNotificationPreferences } from "@/services/settings.service";
import type { NotificationPreferences as PersonalNotificationPreferences } from "@/types/notifications";

const orgNotificationOptions = [
  {
    id: "contractUpdates",
    title: "Contract updates",
    description: "Includes contract-expiring alerts, sent to every active member.",
    icon: FileCheck2,
  },
  {
    id: "riskAlerts",
    title: "Risk alerts",
    description:
      "Includes high/critical risk-flag alerts for the contract's uploader.",
    icon: ShieldAlert,
  },
  {
    id: "aiInsights",
    title: "AI insights",
    description: "Includes AI-analysis-complete alerts for the contract's uploader.",
    icon: Sparkles,
  },
] as const;

type OrgNotificationKey = (typeof orgNotificationOptions)[number]["id"];

const personalNotificationOptions = [
  {
    id: "contractExpiring",
    title: "Contract expiring soon",
    description: "Notify me when a contract is approaching its expiration date.",
    icon: Clock,
  },
  {
    id: "aiAnalysisCompleted",
    title: "AI analysis complete",
    description: "Notify me when AI analysis finishes for a contract I uploaded.",
    icon: Sparkles,
  },
  {
    id: "riskFlagsDetected",
    title: "Risk flag detected",
    description:
      "Notify me when a high or critical risk flag is found in a contract I uploaded.",
    icon: ShieldAlert,
  },
] as const;

type PersonalNotificationKey = (typeof personalNotificationOptions)[number]["id"];

// Must mirror the backend's enforcement default (isOrgNotificationEnabled /
// isPersonalNotificationEnabled in packages/shared/notifications/preferences.ts):
// missing/null means enabled, only an explicit `false` means disabled.
// Defaulting the display to `?? false` instead would show "Disabled" for a
// preference that's actually enabled and firing — caught live while
// verifying this page: a brand-new user's untouched toggle read "Disabled"
// even though notifications were still being sent, which is actively
// misleading rather than just cosmetically inert.
function getOptionValue<K extends string>(
  preferences: Partial<Record<K, boolean>> | null | undefined,
  key: K,
): boolean {
  return preferences?.[key] !== false;
}

type NotificationOptionProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
};

function NotificationOption({
  title,
  description,
  icon: Icon,
  enabled,
  disabled,
  onToggle,
}: NotificationOptionProps) {
  return (
    <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </div>

        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <Button
        type="button"
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        {enabled ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}

// Personal, self-service toggles — every user controls their own, no
// permission gate. Backed by GET/PUT /notifications/preferences, separate
// from the admin-gated workspace section below.
function PersonalNotificationSettings() {
  const preferencesQuery = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const preferences = preferencesQuery.data;

  function handleToggle(id: PersonalNotificationKey) {
    const next: PersonalNotificationPreferences = {
      contractExpiring: getOptionValue(preferences, "contractExpiring"),
      aiAnalysisCompleted: getOptionValue(preferences, "aiAnalysisCompleted"),
      riskFlagsDetected: getOptionValue(preferences, "riskFlagsDetected"),
      [id]: !getOptionValue(preferences, id),
    };

    updatePreferences.mutate(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your notifications</CardTitle>
        <CardDescription>
          Personal preferences — only affect notifications sent to you.
        </CardDescription>
      </CardHeader>

      <CardContent className="divide-y py-0">
        {preferencesQuery.isLoading && (
          <p className="py-4 text-sm text-muted-foreground">
            Loading your notification preferences...
          </p>
        )}

        {preferencesQuery.isError && (
          <p className="py-4 text-sm text-destructive">
            Unable to load your notification preferences.
          </p>
        )}

        {!preferencesQuery.isLoading &&
          !preferencesQuery.isError &&
          personalNotificationOptions.map((option) => (
            <NotificationOption
              key={option.id}
              title={option.title}
              description={option.description}
              icon={option.icon}
              enabled={getOptionValue(preferences, option.id)}
              disabled={updatePreferences.isPending}
              onToggle={() => handleToggle(option.id)}
            />
          ))}
      </CardContent>

      {updatePreferences.isError && (
        <p className="px-6 pb-4 text-sm text-destructive">
          Unable to save your notification preferences.
        </p>
      )}
    </Card>
  );
}

export function NotificationSettings() {
  const settingsQuery = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();

  const settings = settingsQuery.data;
  const preferences = settings?.settings.notificationPreferences as
    | OrgNotificationPreferences
    | null
    | undefined;
  const canManageSettings = settings?.permissions.canManageSettings ?? false;

  function handleToggle(id: OrgNotificationKey) {
    const nextPreferences = {
      contractUpdates: getOptionValue(preferences, "contractUpdates"),
      riskAlerts: getOptionValue(preferences, "riskAlerts"),
      aiInsights: getOptionValue(preferences, "aiInsights"),
      [id]: !getOptionValue(preferences, id),
    };

    updateSettings.mutate({ notificationPreferences: nextPreferences });
  }

  return (
    <div className="space-y-6">
      <PersonalNotificationSettings />

      {settingsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">
          Loading workspace notification preferences...
        </p>
      )}

      {settingsQuery.isError && (
        <p className="text-sm text-destructive">
          Unable to load workspace notification preferences.
        </p>
      )}

      {!settingsQuery.isLoading && !settingsQuery.isError && settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace notifications</CardTitle>
            <CardDescription>
              {canManageSettings
                ? "Organization-wide switches — turning one off stops that notification for every member, not just you."
                : "Organization-wide switches, managed by your workspace Owner or Administrator."}
            </CardDescription>
          </CardHeader>

          <CardContent className="divide-y py-0">
            {orgNotificationOptions.map((option) => (
              <NotificationOption
                key={option.id}
                title={option.title}
                description={option.description}
                icon={option.icon}
                enabled={getOptionValue(preferences, option.id)}
                disabled={!canManageSettings || updateSettings.isPending}
                onToggle={() => handleToggle(option.id)}
              />
            ))}
          </CardContent>

          {updateSettings.isError && (
            <p className="px-6 pb-4 text-sm text-destructive">
              Unable to save workspace notification preferences.
            </p>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <BellRing className="size-4" />
            </div>

            <div>
              <CardTitle className="text-base">Delivery</CardTitle>
              <CardDescription>
                Email and push delivery are not yet implemented — the toggles
                above control in-app notifications only.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
