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
import {
  useContractDetail,
  useContractDownloadUrl,
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
  const downloadContract = useContractDownloadUrl(id);
  const { user } = useAuth();
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);

  function handleDownload() {
    // Open the tab synchronously, inside the click's own call stack — a
    // browser's popup blocker allows this, but would block a window.open()
    // called later from the mutation's onSuccess (after the async request
    // resolves). We navigate this already-open tab once we have the URL.
    const downloadWindow = window.open("", "_blank");
    if (downloadWindow) {
      downloadWindow.opener = null;
    }

    downloadContract.mutate(undefined, {
      onSuccess: (result) => {
        if (downloadWindow) {
          downloadWindow.location.href = result.fileUrl;
        }
      },
      onError: () => {
        downloadWindow?.close();
      },
    });
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

        {/* Action buttons — all wired to real pages/endpoints. */}
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
                  onClick={() => {
                    triggerAnalysis.mutate();
                    navigate(`/contracts/${id}/analysis`);
                  }}
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
                  Contract Investigator
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

          <div className="flex items-center gap-2">
            {canManageLegalState &&
              (isTerminated ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setLegalState.isPending}
                  onClick={() =>
                    setLegalState.mutate({
                      action: "reactivate",
                      version: contract.version,
                    })
                  }
                >
                  {setLegalState.isPending ? "Reactivating…" : "Reactivate"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={setLegalState.isPending}
                  onClick={() => setTerminateDialogOpen(true)}
                >
                  Terminate
                </Button>
              ))}
          </div>

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
                <DropdownMenuItem
                  className="gap-2"
                  disabled={downloadContract.isPending}
                  onClick={handleDownload}
                >
                  <Download className="size-4 text-muted-foreground" />
                  {downloadContract.isPending ? "Preparing…" : "Download"}
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
        {downloadContract.isError && (
          <p className="text-sm text-destructive">
            Couldn't prepare the download. Please try again.
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
