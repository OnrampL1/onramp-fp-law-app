import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthenticatedEntryPath } from "@/lib/auth-navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  useCompleteOrganizationOnboarding,
  useOrganizationOnboarding,
} from "@/hooks/useOnboarding";
import type { NotificationPreferences } from "@/services/settings.service";

const timezoneOptions = [
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Beirut",
] as const;

const languageOptions = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
] as const;

type LanguageCode = (typeof languageOptions)[number]["value"];

const notificationOptions = [
  {
    id: "contractUpdates",
    title: "Contract updates",
    description: "Notify workspace members about contract lifecycle activity.",
    icon: FileCheck2,
  },
  {
    id: "riskAlerts",
    title: "Risk alerts",
    description: "Notify uploaders when high or critical risk flags are found.",
    icon: ShieldAlert,
  },
  {
    id: "aiInsights",
    title: "AI insights",
    description: "Notify uploaders when AI analysis completes.",
    icon: Sparkles,
  },
] as const;

type NotificationKey = (typeof notificationOptions)[number]["id"];

function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }

  return "Unable to complete onboarding.";
}

function isPreferenceEnabled(
  preferences: NotificationPreferences,
  key: NotificationKey,
): boolean {
  return preferences[key] !== false;
}

export function OrganizationOnboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const onboardingQuery = useOrganizationOnboarding();
  const completeOnboarding = useCompleteOrganizationOnboarding();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({
      contractUpdates: true,
      riskAlerts: true,
      aiInsights: true,
    });
  const [error, setError] = useState<string | null>(null);

  const onboarding = onboardingQuery.data;
  const canComplete = onboarding?.permissions.canCompleteOnboarding ?? false;

  useEffect(() => {
    if (!onboarding) return;

    setName(onboarding.organization.name);
    setTimezone(onboarding.settings.timezone);
    setLanguage(onboarding.settings.language);
    setNotificationPreferences({
      contractUpdates:
        onboarding.settings.notificationPreferences?.contractUpdates !== false,
      riskAlerts:
        onboarding.settings.notificationPreferences?.riskAlerts !== false,
      aiInsights:
        onboarding.settings.notificationPreferences?.aiInsights !== false,
    });
  }, [onboarding]);

  function handleToggleNotification(key: NotificationKey) {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: !isPreferenceEnabled(current, key),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canComplete) {
      setError("Only the assigned organization owner can complete onboarding.");
      return;
    }

    try {
      setError(null);

      await completeOnboarding.mutateAsync({
        name,
        timezone,
        language,
        notificationPreferences,
      });

      const refreshedUser = await refreshProfile();
      navigate(getAuthenticatedEntryPath(refreshedUser), { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  if (onboardingQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading organization setup...
        </div>
      </div>
    );
  }

  if (onboardingQuery.isError || !onboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Unable to load onboarding</CardTitle>
            <CardDescription>
              Refresh the page or sign in again to continue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Set up your organization
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the workspace details Clausio uses for contract activity,
              analysis, and notifications.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization profile</CardTitle>
              <CardDescription>
                These details appear across the workspace and settings.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="organization-name">Organization name</Label>
                <Input
                  id="organization-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={completeOnboarding.isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={timezone}
                  onValueChange={(value) => {
                    if (value) setTimezone(value);
                  }}
                  disabled={completeOnboarding.isPending}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label="Organization timezone"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={language}
                  onValueChange={(value) => {
                    if (value) setLanguage(value as LanguageCode);
                  }}
                  disabled={completeOnboarding.isPending}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label="Organization language"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Workspace notifications
              </CardTitle>
              <CardDescription>
                Organization-wide defaults for contract and AI activity.
              </CardDescription>
            </CardHeader>

            <CardContent className="divide-y py-0">
              {notificationOptions.map((option) => {
                const Icon = option.icon;
                const enabled = isPreferenceEnabled(
                  notificationPreferences,
                  option.id,
                );

                return (
                  <div
                    key={option.id}
                    className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{option.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={enabled ? "default" : "outline"}
                      size="sm"
                      disabled={completeOnboarding.isPending}
                      onClick={() => handleToggleNotification(option.id)}
                      className="w-full sm:w-auto"
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {!canComplete && (
            <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              This setup can only be completed by the assigned organization
              owner.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!canComplete || completeOnboarding.isPending}
              className="gap-2"
            >
              {completeOnboarding.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Complete setup
            </Button>
          </div>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5" />
          You can update these settings later from Organization Settings.
        </div>
      </div>
    </div>
  );
}
