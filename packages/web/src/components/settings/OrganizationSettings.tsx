import { useEffect, useState, type FormEvent } from "react";
import { Building2, Save } from "lucide-react";

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
  useOrganizationSettings,
  useUpdateOrganizationSettings,
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

export function OrganizationSettings() {
  const settingsQuery = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [logoUrl, setLogoUrl] = useState("");

  const settings = settingsQuery.data;
  const canManageSettings = settings?.permissions.canManageSettings ?? false;
  const canRenameOrganization =
    settings?.permissions.canRenameOrganization ?? false;

  useEffect(() => {
    if (!settings) return;

    setName(settings.organization.name);
    setTimezone(settings.settings.timezone);
    setLanguage(settings.settings.language);
    setLogoUrl(settings.settings.logoUrl ?? "");
  }, [settings]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    updateSettings.mutate({
      ...(canRenameOrganization && { name }),
      timezone,
      language,
      logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
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
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-muted">
              <Building2 className="size-7 text-muted-foreground" />
            </div>

            <div>
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
              <Label htmlFor="organization-logo">Logo URL</Label>
              <Input
                id="organization-logo"
                type="url"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={!canManageSettings || updateSettings.isPending}
              />
            </div>

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
