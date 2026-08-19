import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Building2, Loader2, Save, Trash2, Upload } from "lucide-react";

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
import {
  useDeleteOrganizationLogo,
  useOrganizationSettings,
  useUpdateOrganizationSettings,
  useUploadOrganizationLogo,
} from "@/hooks/useSettings";

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

// Must stay in sync with packages/api/src/constants/organization-logo.constants.ts
const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
}

export function OrganizationSettings() {
  const settingsQuery = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();
  const uploadLogo = useUploadOrganizationLogo();
  const deleteLogo = useDeleteOrganizationLogo();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const settings = settingsQuery.data;
  const canManageSettings = settings?.permissions.canManageSettings ?? false;
  const canRenameOrganization =
    settings?.permissions.canRenameOrganization ?? false;
  const isLogoBusy = uploadLogo.isPending || deleteLogo.isPending;

  useEffect(() => {
    if (!settings) return;

    setName(settings.organization.name);
    setTimezone(settings.settings.timezone);
    setLanguage(settings.settings.language);
  }, [settings]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    updateSettings.mutate({
      ...(canRenameOrganization && { name }),
      timezone,
      language,
    });
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
      onError: (error) => {
        setLogoError(extractErrorMessage(error, "Could not upload the logo."));
      },
    });
  }

  function handleRemoveLogo() {
    setLogoError(null);

    deleteLogo.mutate(undefined, {
      onError: (error) => {
        setLogoError(extractErrorMessage(error, "Could not remove the logo."));
      },
    });
  }

  if (settingsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading organization settings...
      </p>
    );
  }

  if (settingsQuery.isError || !settings) {
    return (
      <p className="text-sm text-destructive">
        Unable to load organization settings.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization profile</CardTitle>
        <CardDescription>
          Information used to identify your organization across the workspace.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {settings.settings.logoUrl ? (
                <img
                  src={settings.settings.logoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <Building2 className="size-7 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {settings.organization.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {canRenameOrganization
                  ? "Owners can rename the organization and update workspace settings."
                  : canManageSettings
                    ? "Administrators can update workspace settings, but only the owner can rename the organization."
                    : "Your role has read-only access to workspace settings."}
              </p>

              {canManageSettings && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={isLogoBusy}
                    onChange={handleLogoFileChange}
                  />
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
                    {settings.settings.logoUrl ? "Change logo" : "Upload logo"}
                  </Button>
                  {settings.settings.logoUrl && (
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
              )}

              {canManageSettings && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  PNG, JPEG, or WebP, up to 2 MB.
                </p>
              )}

              {logoError && (
                <p className="mt-1.5 text-xs text-destructive" role="alert">
                  {logoError}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {canRenameOrganization && (
              <div className="space-y-2">
                <Label htmlFor="organization-name">Organization name</Label>
                <Input
                  id="organization-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={updateSettings.isPending}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={timezone}
                onValueChange={(value) => {
                  if (value) {
                    setTimezone(value);
                  }
                }}
                disabled={!canManageSettings || updateSettings.isPending}
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
                  if (value) {
                    setLanguage(value as LanguageCode);
                  }
                }}
                disabled={!canManageSettings || updateSettings.isPending}
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
          </div>

          {canManageSettings && (
            <Button
              type="submit"
              disabled={updateSettings.isPending}
              className="gap-2"
            >
              <Save className="size-4" />
              {updateSettings.isPending ? "Saving..." : "Save changes"}
            </Button>
          )}

          {updateSettings.isError && (
            <p className="text-sm text-destructive">
              Unable to save organization settings.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
