import type { LucideIcon } from "lucide-react";
import {
  Bot,
  FileSearch,
  Languages,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrganizationSettings } from "@/hooks/useSettings";

const languageLabels: Record<string, string> = {
  en: "English",
  fr: "French",
  ar: "Arabic",
};

type AiPreferenceRowProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: string;
};

function AiPreferenceRow({
  icon: Icon,
  title,
  description,
  status,
}: AiPreferenceRowProps) {
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

export function AiPreferencesSettings() {
  const settingsQuery = useOrganizationSettings();

  const languageCode = settingsQuery.data?.settings.language ?? "en";
  const languageLabel = languageLabels[languageCode] ?? languageCode;

  if (settingsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading AI preferences...</p>
    );
  }

  if (settingsQuery.isError) {
    return (
      <p className="text-sm text-destructive">Unable to load AI preferences.</p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI review capabilities</CardTitle>
          <CardDescription>
            AI review behavior is controlled by the backend analysis workflow.
          </CardDescription>
        </CardHeader>

        <CardContent className="divide-y py-0">
          <AiPreferenceRow
            icon={ShieldAlert}
            title="Risk detection"
            description="Highlight clauses that may require closer legal review."
            status="Enabled"
          />

          <AiPreferenceRow
            icon={FileSearch}
            title="Clause summaries"
            description="Generate readable summaries for uploaded contract sections."
            status="Enabled"
          />

          <AiPreferenceRow
            icon={Bot}
            title="Plain-language explanations"
            description="Explain legal language in a practical, approachable way."
            status="Enabled"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Languages className="size-4" />
            </div>

            <div>
              <CardTitle className="text-base">Response language</CardTitle>
              <CardDescription>
                AI responses follow the organization language setting.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Badge variant="secondary">{languageLabel}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Sparkles className="size-4" />
            </div>

            <div>
              <CardTitle className="text-base">Analysis style</CardTitle>
              <CardDescription>
                Configurable AI analysis style is not supported by the finalized
                settings schema.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
