import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bot, FileSearch, Languages, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const analysisModes = [
  {
    id: "focused",
    label: "Focused",
    description: "Surface the most important risks and summary points.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Combine concise summaries with practical risk review.",
  },
  {
    id: "detailed",
    label: "Detailed",
    description: "Review clauses with more explanation and supporting context.",
  },
] as const;

const languageOptions = ["English", "French", "Arabic"] as const;

type AnalysisMode = (typeof analysisModes)[number]["id"];
type LanguageOption = (typeof languageOptions)[number];

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
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("balanced");
  const [language, setLanguage] = useState<LanguageOption>("English");

  const selectedMode = analysisModes.find((mode) => mode.id === analysisMode);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis style</CardTitle>
          <CardDescription>
            Choose how detailed AI contract review should be.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {analysisModes.map((mode) => {
              const isSelected = mode.id === analysisMode;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setAnalysisMode(mode.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <p className="text-sm font-medium">{mode.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedMode && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedMode.description}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review focus</CardTitle>
          <CardDescription>
            AI review emphasizes the areas most useful for contract work.
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
          <CardTitle className="text-base">Response language</CardTitle>
          <CardDescription>
            Select the preferred language for AI-generated explanations.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((option) => (
              <Button
                key={option}
                type="button"
                variant={option === language ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage(option)}
              >
                <Languages className="mr-2 size-4" />
                {option}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
