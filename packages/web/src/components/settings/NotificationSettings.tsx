import type { LucideIcon } from "lucide-react";
import { BellRing, FileCheck2, ShieldAlert, Sparkles } from "lucide-react";

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
import type { NotificationPreferences } from "@/services/settings.service";

const notificationOptions = [
  {
    id: "contractUpdates",
    title: "Contract updates",
    description: "Track workspace contract activity preferences.",
    icon: FileCheck2,
  },
  {
    id: "riskAlerts",
    title: "Risk alerts",
    description: "Track preferences for important contract risk updates.",
    icon: ShieldAlert,
  },
  {
    id: "aiInsights",
    title: "AI insights",
    description: "Track preferences for AI-generated review updates.",
    icon: Sparkles,
  },
] as const;

type NotificationKey = (typeof notificationOptions)[number]["id"];

function getPreferenceValue(
  preferences: NotificationPreferences | null | undefined,
  key: NotificationKey,
) {
  return preferences?.[key] ?? false;
}

type NotificationOptionProps = {
  id: NotificationKey;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  disabled: boolean;
  onToggle: (id: NotificationKey) => void;
};

function NotificationOption({
  id,
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
        onClick={() => onToggle(id)}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        {enabled ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}

export function NotificationSettings() {
  const settingsQuery = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();

  const settings = settingsQuery.data;
  const preferences = settings?.settings.notificationPreferences;
  const canManageSettings = settings?.permissions.canManageSettings ?? false;

  function handleToggle(id: NotificationKey) {
    const nextPreferences = {
      contractUpdates: getPreferenceValue(preferences, "contractUpdates"),
      riskAlerts: getPreferenceValue(preferences, "riskAlerts"),
      aiInsights: getPreferenceValue(preferences, "aiInsights"),
      [id]: !getPreferenceValue(preferences, id),
    };

    updateSettings.mutate({ notificationPreferences: nextPreferences });
  }

  if (settingsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading notification preferences...
      </p>
    );
  }

  if (settingsQuery.isError || !settings) {
    return (
      <p className="text-sm text-destructive">
        Unable to load notification preferences.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification preferences</CardTitle>
          <CardDescription>
            Organization-wide preferences for workspace update categories.
          </CardDescription>
        </CardHeader>

        <CardContent className="divide-y py-0">
          {notificationOptions.map((option) => (
            <NotificationOption
              key={option.id}
              id={option.id}
              title={option.title}
              description={option.description}
              icon={option.icon}
              enabled={getPreferenceValue(preferences, option.id)}
              disabled={!canManageSettings || updateSettings.isPending}
              onToggle={handleToggle}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <BellRing className="size-4" />
            </div>

            <div>
              <CardTitle className="text-base">Delivery</CardTitle>
              <CardDescription>
                Delivery infrastructure is not yet implemented; these saved
                preferences only record workspace intent.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {updateSettings.isError && (
        <p className="text-sm text-destructive">
          Unable to save notification preferences.
        </p>
      )}
    </div>
  );
}
