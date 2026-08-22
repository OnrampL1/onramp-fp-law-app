import { useParams, useNavigate, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SeverityBadge } from "@/components/ui/badges";
import { KpiCards, type KpiCardItem } from "@/components/dashboard/KPICard";
import { useContractDetail } from "@/hooks/useContractDetail";
import {
  useAnalysisHistory,
  useRiskOverview,
  useSummaryOverview,
  useTriggerContractAnalysis,
} from "@/hooks/useContractAnalysis";
import type {
  AIAnalysisListItemDto,
  RiskOverviewDto,
} from "@/types/ai-analysis";
import type { Severity } from "@/lib/data";
import { cn, formatDate, formatRelativeTime, formatSummaryParagraphs } from "@/lib/utils";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  ChevronRight,
  Copyright,
  CreditCard,
  DoorOpen,
  FileText,
  Gauge,
  History,
  ListChecks,
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ScrollText,
  Scale,
  ShieldAlert,
  Sparkles,
  Quote,
  XCircle,
  HelpCircle,
} from "lucide-react";

const SEVERITY_LABELS: Record<
  RiskOverviewDto["redFlags"][number]["severity"],
  Severity
> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const CATEGORY_LABELS: Record<string, string> = {
  LIABILITY: "Liability",
  INDEMNIFICATION: "Indemnification",
  AUTO_RENEWAL: "Auto-Renewal",
  TERMINATION: "Termination",
  PAYMENT: "Payment",
  CONFIDENTIALITY: "Confidentiality",
  NON_COMPETE: "Non-Compete",
  IP_ASSIGNMENT: "IP Assignment",
  OTHER: "Other",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LIABILITY: ShieldAlert,
  INDEMNIFICATION: Scale,
  AUTO_RENEWAL: RefreshCw,
  TERMINATION: DoorOpen,
  PAYMENT: CreditCard,
  CONFIDENTIALITY: Lock,
  NON_COMPETE: Ban,
  IP_ASSIGNMENT: Copyright,
  OTHER: HelpCircle,
};

function categoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? HelpCircle;
}

function severityDotColor(score: number) {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

const RISK_MATRIX_ACCENT: Record<Severity, string> = {
  Critical: "border-red-200 bg-red-50 text-red-700",
  High: "border-orange-200 bg-orange-50 text-orange-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const RISK_MATRIX_DOT: Record<Severity, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

const PROCESSING_STATUS_BADGE: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  AI_COMPLETED: {
    label: "Complete",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    icon: CheckCircle2,
  },
  AI_PENDING: {
    label: "Analyzing",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    icon: Clock,
  },
  AI_FAILED: {
    label: "Latest Run Failed",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    icon: XCircle,
  },
};

const ANALYSIS_STATUS_BADGE: Record<
  AIAnalysisListItemDto["status"],
  string
> = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  PENDING:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  FAILED:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

const ANALYSIS_STATUS_DOT: Record<AIAnalysisListItemDto["status"], string> = {
  COMPLETED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  FAILED: "bg-red-500",
};

const ANALYSIS_TYPE_LABELS: Record<AIAnalysisListItemDto["type"], string> = {
  SUMMARY: "Summary",
  RISK: "Risk Analysis",
  CLAUSE_QUERY: "Clause Query",
};

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground text-balance">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
    </div>
  );
}

function RiskFlagCard({ flag }: { flag: RiskOverviewDto["redFlags"][number] }) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {categoryLabel(flag.category)}
          </span>
          <SeverityBadge severity={SEVERITY_LABELS[flag.severity]} />
        </div>
        <p className="text-sm text-muted-foreground text-pretty">
          {flag.description}
        </p>
        <div className="flex gap-2 rounded-md border-l-2 border-border bg-muted/40 p-2 text-xs italic text-muted-foreground">
          <Quote className="size-3.5 shrink-0 opacity-60" />
          <span className="text-pretty">{flag.sourceText}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContractAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contract, isLoading, isError } = useContractDetail(id);
  const riskOverview = useRiskOverview(id, contract?.processingStatus);
  const summaryOverview = useSummaryOverview(id, contract?.processingStatus);
  const analysisHistory = useAnalysisHistory(id);
  const triggerAnalysis = useTriggerContractAnalysis(id);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading contract…
      </div>
    );
  }

  if (isError || !contract || !id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Contract not found</p>
        <Link to="/contracts" className="text-primary hover:underline">
          Back to Contracts
        </Link>
      </div>
    );
  }

  const breadcrumb = (
    <nav
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <Link to="/dashboard" className="transition-colors hover:text-foreground">
        Dashboard
      </Link>
      <ChevronRight className="size-3.5" />
      <Link to="/contracts" className="transition-colors hover:text-foreground">
        Contracts
      </Link>
      <ChevronRight className="size-3.5" />
      <Link
        to={`/contracts/${contract.id}`}
        className="truncate transition-colors hover:text-foreground"
      >
        {contract.title}
      </Link>
      <ChevronRight className="size-3.5" />
      <span className="truncate font-medium text-foreground">AI Analysis</span>
    </nav>
  );

  const statusBadge = PROCESSING_STATUS_BADGE[contract.processingStatus];

  const header = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <Sparkles className="size-5 text-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            AI Analysis
          </h1>
          {statusBadge && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 font-medium rounded-full",
                statusBadge.className,
              )}
            >
              <statusBadge.icon className="size-3" />
              {statusBadge.label}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileText className="size-3.5" />
            {contract.title}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => navigate(`/contracts/${contract.id}`)}
      >
        <ArrowLeft className="size-4" />
        Back to Contract
      </Button>
    </div>
  );

  // No completed risk analysis exists yet for this contract — almost every
  // section on this page derives from it, so this is the page-level empty
  // state rather than something handled section-by-section.
  if (riskOverview.isError) {
    const notFound =
      isAxiosError(riskOverview.error) &&
      riskOverview.error.response?.status === 404;

    const canTrigger =
      contract.processingStatus !== "PENDING_EXTRACTION" &&
      contract.processingStatus !== "EXTRACTION_FAILED" &&
      contract.processingStatus !== "AI_PENDING";

    return (
      <div className="space-y-6">
        {breadcrumb}
        {header}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            {notFound ? (
              <>
                <ShieldAlert className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  No AI analysis yet for this contract
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Run analysis to generate a risk score, findings, and a
                  summary for this contract.
                </p>
                <Button
                  className="mt-2 gap-2"
                  disabled={!canTrigger || triggerAnalysis.isPending}
                  onClick={() => triggerAnalysis.mutate()}
                >
                  <Sparkles className="size-4" />
                  {triggerAnalysis.isPending ? "Queuing…" : "Run Analysis"}
                </Button>
                {triggerAnalysis.isError && (
                  <p className="text-sm text-destructive">
                    {isAxiosError(triggerAnalysis.error) &&
                    triggerAnalysis.error.response?.status === 409
                      ? "This contract hasn't finished text extraction yet."
                      : "Couldn't queue analysis. Please try again."}
                  </p>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Couldn't load AI analysis
                </p>
                <p className="text-sm text-muted-foreground">
                  Reload the page and try again.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (riskOverview.isLoading || !riskOverview.data) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        {header}
        <div className="flex h-[40vh] items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading AI analysis…
        </div>
      </div>
    );
  }

  const risk = riskOverview.data;

  const criticalCount = risk.redFlags.filter(
    (f) => f.severity === "CRITICAL",
  ).length;

  const kpis: KpiCardItem[] = [
    {
      icon: <Gauge className="size-5" />,
      value: risk.healthScore,
      label: "Health Score",
      sublabel: "100 = lowest risk",
    },
    {
      icon: <Sparkles className="size-5" />,
      value: risk.model ?? "—",
      label: "AI Model",
      sublabel: "Model used for this run",
    },
    {
      icon: <FileText className="size-5" />,
      value: risk.redFlags.length,
      label: "Findings",
      sublabel: `${criticalCount} critical`,
    },
    {
      icon: <CalendarClock className="size-5" />,
      value: formatRelativeTime(risk.createdAt),
      label: "Last Analyzed",
      sublabel: formatDate(risk.createdAt),
    },
  ];

  const severityCounts: Record<Severity, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };
  for (const flag of risk.redFlags) {
    severityCounts[SEVERITY_LABELS[flag.severity]] += 1;
  }

  const categoryCounts = new Map<string, number>();
  for (const flag of risk.redFlags) {
    categoryCounts.set(flag.category, (categoryCounts.get(flag.category) ?? 0) + 1);
  }
  const maxCategoryCount = Math.max(1, ...categoryCounts.values());

  const paymentFlags = risk.redFlags.filter((f) => f.category === "PAYMENT");
  const terminationFlags = risk.redFlags.filter(
    (f) => f.category === "TERMINATION" || f.category === "AUTO_RENEWAL",
  );

  const obligations = risk.timeline.filter((e) => e.kind === "OBLIGATION");
  const keyDates = risk.timeline.filter((e) => e.kind === "KEY_DATE");

  const summaryLoading = summaryOverview.isLoading;
  const summaryText = summaryOverview.data?.text ?? null;
  const summaryFallback = !summaryText && !summaryLoading ? risk.summary : null;

  return (
    <div className="space-y-6">
      {breadcrumb}
      {header}

      <KpiCards items={kpis} />

      {/* Executive Summary */}
      <section className="space-y-4">
        <SectionHeading
          icon={ScrollText}
          title="Executive Summary"
          description="AI-generated overview of the agreement and its principal risk posture."
        />
        <Card>
          <CardContent className="space-y-3 pt-6">
            {summaryLoading ? (
              <p className="text-sm text-muted-foreground">Loading summary…</p>
            ) : summaryText ? (
              formatSummaryParagraphs(summaryText).map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-muted-foreground text-pretty"
                >
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {summaryFallback}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Key Obligations */}
      {obligations.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={ListChecks}
            title="Key Obligations"
            description="Material commitments extracted for each party."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {obligations.map((o, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 pt-6">
                  {o.party && (
                    <Badge variant="outline" className="text-xs rounded-full">
                      {o.party}
                    </Badge>
                  )}
                  <p className="text-sm font-medium text-foreground text-pretty">
                    {o.label}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatDate(o.date)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Key Dates */}
      {keyDates.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={CalendarClock}
            title="Key Dates"
            description="Important dates identified in the agreement."
          />
          <Card>
            <CardContent className="divide-y divide-border pt-2">
              {keyDates.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="text-foreground">{d.label}</span>
                  <span className="font-medium text-muted-foreground">
                    {formatDate(d.date)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Risk Assessment */}
      <section className="space-y-4">
        <SectionHeading
          icon={ShieldAlert}
          title="Risk Assessment"
          description="Severity matrix and category distribution across the agreement."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["Critical", "High", "Medium", "Low"] as Severity[]).map((level) => (
            <Card key={level} className={cn("border", RISK_MATRIX_ACCENT[level])}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("size-2.5 rounded-full", RISK_MATRIX_DOT[level])}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold">{level}</span>
                  </div>
                  <span className="text-sm font-semibold tracking-tight">
                    {severityCounts[level]}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {categoryCounts.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Risk by Clause Category
              </CardTitle>
              <CardDescription>
                Distribution of findings grouped by contractual domain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...categoryCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => {
                  const Icon = categoryIcon(category);
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className="flex w-36 shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon className="size-3.5 shrink-0" />
                        {categoryLabel(category)}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            severityDotColor((count / maxCategoryCount) * 100),
                          )}
                          style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Payment Risks */}
      {paymentFlags.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={CreditCard}
            title="Payment Risks"
            description="Findings related to invoicing terms, penalties, and escalation."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {paymentFlags.map((flag, i) => (
              <RiskFlagCard key={i} flag={flag} />
            ))}
          </div>
        </section>
      )}

      {/* Termination & Renewal Risks */}
      {terminationFlags.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={DoorOpen}
            title="Termination & Renewal Risks"
            description="Findings related to term length, renewal mechanics, and exit provisions."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {terminationFlags.map((flag, i) => (
              <RiskFlagCard key={i} flag={flag} />
            ))}
          </div>
        </section>
      )}

      {/* Risk Findings */}
      <section className="space-y-4">
        <SectionHeading
          icon={FileText}
          title="Risk Findings"
          description="All findings with the originating clause excerpt."
        />
        {risk.redFlags.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No risk flags were identified in this contract.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[18%]">Category</TableHead>
                  <TableHead className="w-[110px]">Severity</TableHead>
                  <TableHead className="w-[34%]">Clause Excerpt</TableHead>
                  <TableHead>Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risk.redFlags.map((f, i) => {
                  const Icon = categoryIcon(f.category);
                  return (
                  <TableRow key={i} className="align-top">
                    <TableCell className="whitespace-normal font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        {categoryLabel(f.category)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={SEVERITY_LABELS[f.severity]} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex gap-2 rounded-md border-l-2 border-border bg-muted/40 p-2 text-xs italic text-muted-foreground">
                        <Quote className="size-3.5 shrink-0 opacity-60" />
                        <span className="text-pretty">{f.sourceText}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm text-muted-foreground text-pretty">
                      {f.description}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      {/* Analysis History */}
      <section className="space-y-4">
        <SectionHeading
          icon={History}
          title="Analysis History"
          description="Prior AI runs for this contract."
        />
        <Card className="overflow-hidden">
          {analysisHistory.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading history…
            </div>
          ) : !analysisHistory.data || analysisHistory.data.items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No analysis runs recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisHistory.data.items.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {formatDate(run.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(run.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ANALYSIS_TYPE_LABELS[run.type]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {run.modelVersion ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {run.tokensUsed ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 font-medium rounded-full",
                          ANALYSIS_STATUS_BADGE[run.status],
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            ANALYSIS_STATUS_DOT[run.status],
                          )}
                          aria-hidden
                        />
                        {run.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}
