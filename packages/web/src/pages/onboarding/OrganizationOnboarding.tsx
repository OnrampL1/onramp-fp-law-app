import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Save,
  Scale,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
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
import { getAuthenticatedEntryPath } from "@/lib/auth-navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  useCompleteOrganizationOnboarding,
  useOrganizationOnboarding,
} from "@/hooks/useOnboarding";
import {
  useDeleteOrganizationLogo,
  useOrganizationSettings,
  useUploadOrganizationLogo,
} from "@/hooks/useSettings";
import type { NotificationPreferences } from "@/services/settings.service";

// Must stay in sync with packages/api/src/constants/organization-logo.constants.ts
const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;

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

function extractLogoErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
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

  const settingsQuery = useOrganizationSettings();
  const uploadLogo = useUploadOrganizationLogo();
  const deleteLogo = useDeleteOrganizationLogo();
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const isLogoBusy = uploadLogo.isPending || deleteLogo.isPending;

  const [name, setName] = useState("");
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

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    event.target.value = "";

    if (!file) return;

    setLogoError(null);

    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
      setLogoError("Logo must be a PNG, JPEG, or WebP image.");
      return;
    }

    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      setLogoError("Logo must be 2 MB or smaller.");
      return;
    }

    uploadLogo.mutate(file, {
      onError: (uploadError) => {
        setLogoError(
          extractLogoErrorMessage(uploadError, "Could not upload the logo."),
        );
      },
    });
  }

  function handleRemoveLogo() {
    setLogoError(null);

    deleteLogo.mutate(undefined, {
      onError: (deleteError) => {
        setLogoError(
          extractLogoErrorMessage(deleteError, "Could not remove the logo."),
        );
      },
    });
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

  const logoUrl = settingsQuery.data?.settings.logoUrl ?? null;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Scale className="size-7" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Welcome to Clausio
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
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

            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Organization logo</p>
                  <p className="text-xs text-muted-foreground">
                    Shown across the workspace, sidebar, and shared documents.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Building2 className="size-7 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={isLogoBusy}
                      onChange={handleLogoFileChange}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isLogoBusy}
                        onClick={() => logoFileInputRef.current?.click()}
                      >
                        {uploadLogo.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        {logoUrl ? "Change logo" : "Upload logo"}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-destructive"
                          disabled={isLogoBusy}
                          onClick={handleRemoveLogo}
                        >
                          {deleteLogo.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Remove
                        </Button>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      PNG, JPEG, or WebP, up to 2 MB.
                    </p>

                    {logoError && (
                      <p
                        className="mt-1.5 text-xs text-destructive"
                        role="alert"
                      >
                        {logoError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization-name">Organization name</Label>
                <Input
                  id="organization-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={completeOnboarding.isPending}
                  required
                />
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
