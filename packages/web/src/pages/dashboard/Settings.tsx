import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AiPreferencesSettings } from "@/components/settings/AiPreferencesSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

type SettingsSection =
  | "profile"
  | "organization"
  | "security"
  | "ai"
  | "notifications";

type SettingsNavItem = {
  id: SettingsSection;
  label: string;
  description: string;
  icon: LucideIcon;
};

const settingsNavItems: SettingsNavItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Manage your personal account details.",
    icon: UserRound,
  },
  {
    id: "organization",
    label: "Organization",
    description: "Configure your workspace information.",
    icon: Building2,
  },
  {
    id: "security",
    label: "Security",
    description: "Manage authentication and access policies.",
    icon: ShieldCheck,
  },
  {
    id: "ai",
    label: "AI preferences",
    description: "Control contract analysis behavior.",
    icon: Sparkles,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Choose which updates you receive.",
    icon: Bell,
  },
];

export function Settings() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");

  const activeNavItem =
    settingsNavItems.find((item) => item.id === activeSection) ??
    settingsNavItems[0];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <SettingsIcon className="size-5" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, workspace, and application preferences.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {settingsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors lg:min-w-0",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {activeNavItem.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeNavItem.description}
            </p>
          </div>

          {activeSection === "profile" && <ProfileSettings />}
          {activeSection === "organization" && <OrganizationSettings />}
          {activeSection === "security" && <SecuritySettings />}
          {activeSection === "ai" && <AiPreferencesSettings />}
          {activeSection === "notifications" && <NotificationSettings />}
        </section>
      </div>
    </div>
  );
}
