import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
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
  RotateCcw,
  XCircle,
} from "lucide-react";
import { ContractMetadata } from "@/components/contracts/ContractMetaData";
import { ContractContentViewer } from "@/components/contracts/ContractContentViewer";
import { ContractInsights } from "@/components/contracts/ContractInsights";
import { ContractTimeline } from "@/components/contracts/ContractTimeline";
import {
  useContractDetail,
  useSetContractLegalState,
} from "@/hooks/useContractDetail";
import { useTriggerContractAnalysis } from "@/hooks/useContractAnalysis";
import { isAxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { TerminateContractDialog } from "@/components/contracts/TerminateContractDialog";

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
  const setLegalState = useSetContractLegalState(id);
  const { user } = useAuth();
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);

  function handleDownload() {
    // Navigates to our own ContractFileViewer page rather than straight to
    // the presigned S3 URL — that page owns the tab's title (see its own
    // comment for why) and embeds the actual file. The target is a
    // same-origin route known synchronously from `id`, so no popup-blocker
    // workaround is needed here.
    window.open(`/contracts/${id}/file`, "_blank", "noopener,noreferrer");
  }

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

  const canManageLegalState = user?.role === "OWNER" || user?.role === "ADMIN";
  const isTerminated = contract.legalState === "TERMINATED";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-foreground">
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

        {/* Action buttons — Edit is the primary CTA (filled). AI Tools stays
    a labeled dropdown since it fans out into 3 distinct actions. Terminate
    stays a standalone, labeled, colored button rather than hidden in a
    menu — a legal-status change deserves visibility, not a guess from an
    icon. Only "More" (genuinely secondary utility actions) is icon-only,
    the one place that convention is actually earned. All actions are wired
    to real pages/endpoints. */}
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
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
                  onClick={() => navigate(`/contracts/${id}/analysis`)}
                >
                  <Sparkles className="size-4 text-muted-foreground" />
                  View AI Analysis
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => navigate(`/contracts/${id}/investigator`)}
                >
                  <Search className="size-4 text-muted-foreground" />
                  Contract Investigator
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="default"
            className="gap-2"
            onClick={() => navigate(`/contracts/${id}/edit`)}
          >
            <Pencil className="size-4" />
            Edit Contract
          </Button>

          {canManageLegalState &&
            (isTerminated ? (
              <Button
                variant="outline"
                className="gap-2"
                disabled={setLegalState.isPending}
                onClick={() =>
                  setLegalState.mutate({
                    action: "reactivate",
                    version: contract.version,
                  })
                }
              >
                {setLegalState.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                {setLegalState.isPending ? "Reactivating…" : "Reactivate"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="gap-2 text-primary-foreground"
                disabled={setLegalState.isPending}
                onClick={() => setTerminateDialogOpen(true)}
              >
                {setLegalState.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                Terminate
              </Button>
            ))}

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="More actions"
                      />
                    }
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </TooltipTrigger>
              <TooltipContent>More Actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2" onClick={handleDownload}>
                  <Download className="size-4 text-muted-foreground" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => navigate(`/witness-workflow?contractId=${id}`)}
                >
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
        {setLegalState.isError && (
          <p className="text-sm text-destructive">
            Couldn't update the contract status. Reload and try again.
          </p>
        )}
      </div>

      <TerminateContractDialog
        open={terminateDialogOpen}
        onOpenChange={setTerminateDialogOpen}
        isPending={setLegalState.isPending}
        onConfirm={() =>
          setLegalState.mutate(
            { action: "terminate", version: contract.version },
            { onSuccess: () => setTerminateDialogOpen(false) },
          )
        }
      />

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
