import { useState } from "react";
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

const notificationOptions = [
  {
    id: "contractUpdates",
    title: "Contract updates",
    description: "Receive updates when contract review activity changes.",
    icon: FileCheck2,
  },
  {
    id: "riskAlerts",
    title: "Risk alerts",
    description: "Receive alerts when important contract risks are detected.",
    icon: ShieldAlert,
  },
  {
    id: "aiInsights",
    title: "AI insights",
    description: "Receive notifications about AI-generated review insights.",
    icon: Sparkles,
  },
] as const;

type NotificationKey = (typeof notificationOptions)[number]["id"];

type NotificationOptionProps = {
  id: NotificationKey;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: (id: NotificationKey) => void;
};

function NotificationOption({
  id,
  title,
  description,
  icon: Icon,
  enabled,
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
        className="w-full sm:w-auto"
      >
        {enabled ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<
    Record<NotificationKey, boolean>
  >({
    contractUpdates: true,
    riskAlerts: true,
    aiInsights: false,
  });

  function handleToggle(id: NotificationKey) {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [id]: !currentPreferences[id],
    }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification preferences</CardTitle>
          <CardDescription>
            Choose which workspace updates should notify you.
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
              enabled={preferences[option.id]}
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
                Notifications are shown inside the workspace experience.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
