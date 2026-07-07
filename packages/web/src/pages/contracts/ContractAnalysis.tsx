import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskBadge, SeverityBadge } from "@/components/ui/badges";
import { KpiCards, type KpiCardItem } from "@/components/dashboard/KPICard";
import {
  contractDetails,
  contractAnalysisById,
  type AnalysisStatus,
  type RiskLevel,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronRight,
  ScrollText,
  ListChecks,
  CreditCard,
  DoorOpen,
  ShieldAlert,
  FileText,
  Lightbulb,
  History,
  Quote,
  Sparkles,
  ShieldCheck,
  Gauge,
  Timer,
  Clock,
} from "lucide-react";

// Temporary: mock detail/analysis data only exists for a handful of contract
// ids; unknown ids fall back to the default contract below.
// When the backend is ready, replace this with an API call:
//   const { data } = useQuery(['contract-analysis', id], () => api.getContractAnalysis(id));
const DEFAULT_CONTRACT_ID = "CTR-10470";

function useContractAnalysisData(id: string | undefined) {
  const key = id && contractDetails[id] ? id : DEFAULT_CONTRACT_ID;
  const analysisKey = contractAnalysisById[key] ? key : DEFAULT_CONTRACT_ID;
  return {
    contract: contractDetails[key],
    analysis: contractAnalysisById[analysisKey],
  };
}

const statusStyles: Record<AnalysisStatus, string> = {
  Complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Analyzing: "bg-amber-50 text-amber-700 border-amber-200",
  Outdated: "bg-muted text-muted-foreground border-border",
  Queued: "bg-muted text-muted-foreground border-border",
};

const riskMatrixAccent: Record<RiskLevel, string> = {
  Critical: "border-red-200 bg-red-50",
  High: "border-orange-200 bg-orange-50",
  Medium: "border-amber-200 bg-amber-50",
  Low: "border-emerald-200 bg-emerald-50",
};

const riskMatrixDot: Record<RiskLevel, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

const priorityStyles: Record<string, string> = {
  Urgent: "bg-red-50 text-red-700 border-red-200",
  Recommended: "bg-amber-50 text-amber-700 border-amber-200",
  Optional: "bg-muted text-muted-foreground border-border",
};

function categoryBarColor(score: number) {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

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

export default function ContractAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contract: c, analysis: a } = useContractAnalysisData(id);

  const renewalScore =
    a.riskByCategory.find((cat) => cat.category === "Renewal")?.score ?? 0;
  const renewalRisk: RiskLevel =
    renewalScore >= 70 ? "High" : renewalScore >= 40 ? "Medium" : "Low";

  const kpis: KpiCardItem[] = [
    {
      icon: <Gauge className="size-5" />,
      value: a.riskScore,
      label: "Risk Score",
      sublabel: `${a.riskScoreDelta > 0 ? "+" : ""}${a.riskScoreDelta} vs last run`,
    },
    {
      icon: <ShieldCheck className="size-5" />,
      value: `${a.confidence}%`,
      label: "AI Confidence",
      sublabel: a.model,
    },
    {
      icon: <FileText className="size-5" />,
      value: a.findings.length,
      label: "Findings",
      sublabel: `${a.riskMatrix.find((r) => r.level === "Critical")?.count ?? 0} critical`,
    },
    {
      icon: <Timer className="size-5" />,
      value: a.processingTime,
      label: "Processing Time",
      sublabel: `Last run ${a.lastRun}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link
          to="/dashboard"
          className="transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          to="/contracts"
          className="transition-colors hover:text-foreground"
        >
          Contracts
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          to={`/contracts/${c.id}`}
          className="truncate transition-colors hover:text-foreground"
        >
          {c.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate font-medium text-foreground">
          AI Analysis
        </span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              AI Analysis
            </h1>
            <Badge
              variant="outline"
              className={cn("font-medium rounded-full", statusStyles[a.status])}
            >
              {a.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {c.name} · {c.id}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Last run {a.lastRun}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate(`/contracts/${c.id}`)}
        >
          <ArrowLeft className="size-4" />
          Back to Contract
        </Button>
      </div>

      {/* Stat tiles */}
      <KpiCards items={kpis} />

      {/* Executive Summary */}
      <section className="space-y-4">
        <SectionHeading
          icon={ScrollText}
          title="Executive Summary"
          description="AI-generated overview of the agreement and its principal risk posture."
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {a.executiveSummary}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Key Obligations */}
      <section className="space-y-4">
        <SectionHeading
          icon={ListChecks}
          title="Key Obligations"
          description="Material commitments extracted for each party with their cadence."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {a.keyObligations.map((o, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 pt-6">
                <Badge
                  variant="outline"
                  className="text-xs rounded-full items-center"
                >
                  {o.party}
                </Badge>
                <p className="text-sm font-medium text-foreground text-pretty">
                  {o.obligation}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {o.deadline}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Payment + Termination */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionHeading
            icon={CreditCard}
            title="Payment Analysis"
            description="Invoicing terms, penalties, and escalation provisions."
          />
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-3">
                {a.paymentAnalysis.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-border bg-muted/40 p-3"
                  >
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Terms</span>
                  <span className="font-medium text-foreground text-right">
                    {a.paymentAnalysis.terms}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Schedule</span>
                  <span className="font-medium text-foreground text-right">
                    {a.paymentAnalysis.schedule}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Penalties</span>
                  <span className="font-medium text-foreground text-right">
                    {a.paymentAnalysis.penalties}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Escalation</span>
                  <span className="font-medium text-foreground text-right">
                    {a.paymentAnalysis.escalation}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionHeading
            icon={DoorOpen}
            title="Termination Analysis"
            description="Term length, renewal mechanics, and exit provisions."
          />
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  Renewal Risk
                </span>
                <RiskBadge risk={renewalRisk} />
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">For cause</span>
                  <span className="font-medium text-foreground text-right">
                    {a.terminationAnalysis.forCause}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">For convenience</span>
                  <span className="font-medium text-foreground text-right">
                    {a.terminationAnalysis.forConvenience}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Auto-renewal</span>
                  <span className="font-medium text-foreground text-right">
                    {a.terminationAnalysis.autoRenewal}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Notice period</span>
                  <span className="font-medium text-foreground text-right">
                    {a.terminationAnalysis.noticePeriod}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-accent/60 p-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                  {a.terminationAnalysis.flag}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Risk Assessment */}
      <section className="space-y-4">
        <SectionHeading
          icon={ShieldAlert}
          title="Risk Assessment"
          description="Severity matrix and category distribution across the agreement."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {a.riskMatrix.map((r) => (
            <Card
              key={r.level}
              className={cn("border", riskMatrixAccent[r.level])}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        riskMatrixDot[r.level],
                      )}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-gray-600">
                      {r.level}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tracking-tight text-gray-600">
                    {r.count}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
            {a.riskByCategory.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-muted-foreground">
                  {cat.category}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      categoryBarColor(cat.score),
                    )}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
                  {cat.score}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Risk Findings */}
      <section className="space-y-4">
        <SectionHeading
          icon={FileText}
          title="Risk Findings"
          description="Detailed findings with the originating clause excerpt and AI explanation."
        />
        <Card className="overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%]">Risk Type</TableHead>
                <TableHead className="w-[110px]">Severity</TableHead>
                <TableHead className="w-[34%]">Clause Excerpt</TableHead>
                <TableHead>Explanation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {a.findings.map((f, i) => (
                <TableRow key={i} className="align-top">
                  <TableCell className="whitespace-normal">
                    <p className="font-medium text-foreground text-pretty">
                      {f.type}
                    </p>
                    <p className="text-xs text-muted-foreground">{f.section}</p>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={f.severity} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex gap-2 rounded-md border-l-2 border-border bg-muted/40 p-2 text-xs italic text-muted-foreground">
                      <Quote className="size-3.5 shrink-0 opacity-60" />
                      <span className="text-pretty">{f.excerpt}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm text-muted-foreground text-pretty">
                    {f.explanation}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <SectionHeading
          icon={Lightbulb}
          title="Recommendations"
          description="Prioritized actions to remediate findings before counter-signature."
        />
        <Card>
          <CardContent className="divide-y divide-border pt-2">
            {a.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4 py-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {rec.title}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium rounded-full",
                        priorityStyles[rec.priority],
                      )}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty">
                    {rec.detail}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Analysis History */}
      <section className="space-y-4">
        <SectionHeading
          icon={History}
          title="Analysis History"
          description="Prior AI runs with their resulting risk score over time."
        />
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Triggered By</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Findings</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {a.history.map((run) => (
                <TableRow key={run.version}>
                  <TableCell>
                    <p className="font-medium text-foreground">{run.version}</p>
                    <p className="text-xs text-muted-foreground">{run.date}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.trigger}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback className="text-[10px] font-semibold">
                          {run.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{run.actor}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">
                    {run.riskScore}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {run.findings}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.status === "Complete" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full"
                      >
                        Current
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground rounded-full"
                      >
                        {run.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
