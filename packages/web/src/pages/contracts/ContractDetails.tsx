import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContractStatus } from "@/lib/data";
import {
  ChevronRight,
  Pencil,
  ChevronDown,
  Link2,
  Download,
  Clock,
  FileText,
  CircleDot,
  Sparkles,
  ScrollText,
  Search,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { ContractMetadata } from "@/components/contracts/ContractMetaData";
import { ContractContentViewer } from "@/components/contracts/ContractContentViewer";
import { ContractInsights } from "@/components/contracts/ContractInsights";
import { ContractTimeline } from "@/components/contracts/ContractTimeline";
import { useContractDetail } from "@/hooks/useContractDetail";
import { useTriggerContractAnalysis } from "@/hooks/useContractAnalysis";
import { isAxiosError } from "axios";

const statuses: ContractStatus[] = ["Draft", "Active", "Expired", "Terminated"];

const LEGAL_STATE_TO_STATUS: Record<string, ContractStatus> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contract, isLoading, isError } = useContractDetail(id);
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

  const status = contract.legalState
    ? LEGAL_STATE_TO_STATUS[contract.legalState]
    : null;

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
        <span className="truncate font-medium text-foreground">
          {contract.title}
        </span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              {contract.title}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {contract.fileName}
            </span>
            <span className="flex items-center gap-1.5">
              <CircleDot className="size-3.5" />
              {contract.counterparty}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Last updated {formatDate(contract.updatedAt)}
            </span>
          </div>
        </div>

        {/* Action buttons — Download / Witness Link remain non-functional
    placeholders until those features are built. Edit Contract,
    Clause Investigator, and Analyze Contract are wired to real
    pages/endpoints. */}
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                />
              }
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4" />
                AI Tools
                <ChevronDown className="size-4" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>AI Tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  disabled={
                    triggerAnalysis.isPending ||
                    contract.processingStatus === "PENDING_EXTRACTION" ||
                    contract.processingStatus === "EXTRACTION_FAILED" ||
                    contract.processingStatus === "AI_PENDING"
                  }
                  onClick={() => triggerAnalysis.mutate()}
                >
                  <ScrollText className="size-4 text-muted-foreground" />
                  {triggerAnalysis.isPending
                    ? "Queuing..."
                    : "Analyze Contract"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => navigate(`/contracts/${id}/investigator`)}
                >
                  <Search className="size-4 text-muted-foreground" />
                  Clause Investigator
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/contracts/${id}/edit`)}
          >
            <Pencil className="size-4" />
            Edit Contract
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="gap-2" />}
            >
              <span className="flex items-center gap-2">
                Status
                {status ? (
                  <StatusBadge status={status} />
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
                <ChevronDown className="size-4 text-muted-foreground" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Set contract status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statuses.map((s) => (
                  <DropdownMenuItem key={s} className="gap-2">
                    <StatusBadge status={s} />
                    {s === status && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Current
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More actions"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2">
                  <Download className="size-4 text-muted-foreground" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  Generate Witness Link
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {triggerAnalysis.isError && (
          <p className="text-sm text-destructive">
            {isAxiosError(triggerAnalysis.error) &&
            triggerAnalysis.error.response?.status === 409
              ? "This contract hasn't finished text extraction yet."
              : "Couldn't queue analysis. Please try again."}
          </p>
        )}
      </div>

      {/* 3-column workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ContractMetadata contract={contract} />
        </div>
        <div className="lg:col-span-6">
          <ContractContentViewer
            contractId={contract.id}
            processingStatus={contract.processingStatus}
            processingError={contract.processingError}
          />
        </div>
        <div className="lg:col-span-3">
          <ContractInsights
            contractId={contract.id}
            processingStatus={contract.processingStatus}
          />
        </div>
      </div>

      {/* Bottom: activity timeline */}
      <ContractTimeline key={contract.id} contractId={contract.id} />
    </div>
  );
}
