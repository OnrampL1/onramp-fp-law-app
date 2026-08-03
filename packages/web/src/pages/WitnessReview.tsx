import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  Clock3,
  FileWarning,
  Loader2,
  ShieldOff,
} from "lucide-react";
import {
  WitnessReviewHeader,
  ContractInfoCard,
  ContractDocumentViewer,
  WitnessAcknowledgementPanel,
  WitnessReviewFooter,
} from "../components/witness-review";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useWitnessPortal, type WitnessPortalErrorKind } from "@/hooks/useWitnessPortal";
import { formatDate } from "@/lib/utils";
import type { DocumentPage, WitnessInfo, WitnessReviewContract } from "../components/witness-review/types";
import type { WitnessPortalContract } from "@/types/witness-portal";

function humanizeStatus(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// extractedText is a flat string (no page/section structure from the AI
// extraction pipeline) — wrapped as a single synthetic "page" so the
// existing search/zoom viewer still works over the real contract text
// instead of needing a second, simpler viewer built just for this case.
function buildDocumentPages(contract: WitnessPortalContract): DocumentPage[] {
  const paragraphs =
    contract.extractedText
      ?.trim()
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean) ?? [];

  return [
    {
      pageNumber: 1,
      totalPages: 1,
      title: contract.title,
      sections: [
        {
          heading: contract.title,
          paragraphs: paragraphs.length
            ? paragraphs
            : ["No extracted text is available for this contract yet."],
        },
      ],
    },
  ];
}

// Mirrors ContractContentViewer.tsx's pending/failed handling for the
// internal contract viewer — a witness only cares whether text extraction
// itself succeeded, never how far the (internal-only) AI analysis has
// gotten, so every other processingStatus falls through to the real viewer.
function DocumentStateCard({
  contract,
}: {
  contract: WitnessPortalContract;
}) {
  if (contract.processingStatus === "PENDING_EXTRACTION") {
    return (
      <Card className="flex min-h-[480px] flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p>Extracting document text — this can take a moment.</p>
      </Card>
    );
  }

  if (contract.processingStatus === "EXTRACTION_FAILED") {
    return (
      <Card className="flex min-h-[480px] flex-col items-center justify-center gap-3 p-8 text-center">
        <FileWarning className="size-6 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          Text extraction failed
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {contract.processingError ?? "This file could not be processed."}
        </p>
      </Card>
    );
  }

  return <ContractDocumentViewer pages={buildDocumentPages(contract)} />;
}

const PROBLEM_COPY: Record<
  WitnessPortalErrorKind,
  { icon: typeof AlertTriangle; title: string; description: string }
> = {
  "not-found": {
    icon: Ban,
    title: "This witness link doesn't exist",
    description: "Double-check the link you were sent — it may have been mistyped or truncated.",
  },
  expired: {
    icon: Clock3,
    title: "This witness link has expired",
    description: "Contact whoever sent you this link to request a new one.",
  },
  revoked: {
    icon: ShieldOff,
    title: "Access to this contract has been revoked",
    description: "The organization that sent you this link has revoked access. Contact them if you believe this is a mistake.",
  },
  used: {
    icon: Ban,
    title: "This witness link has already been used",
    description: "Witness links are single-use. If you need access again, contact whoever sent it to request a new link.",
  },
  unknown: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "We couldn't verify this witness link. Please try again.",
  },
};

function ProblemScreen({
  kind,
  message,
  onRetry,
}: {
  kind: WitnessPortalErrorKind;
  message?: string;
  onRetry?: () => void;
}) {
  const copy = PROBLEM_COPY[kind];
  const Icon = copy.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WitnessReviewHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:px-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{message ?? copy.description}</p>
        {onRetry && kind === "unknown" && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            Try again
          </Button>
        )}
      </main>
      <WitnessReviewFooter />
    </div>
  );
}

export function WitnessReview() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError, errorInfo, refetch } = useWitnessPortal(token);

  if (!token) {
    return <ProblemScreen kind="not-found" />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <WitnessReviewHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:px-6">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifying your access…</p>
        </main>
        <WitnessReviewFooter />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ProblemScreen
        kind={errorInfo?.kind ?? "unknown"}
        message={errorInfo?.message}
        onRetry={() => refetch()}
      />
    );
  }

  const { contract, witnessName, witnessEmail, usedAt } = data;

  const reviewContract: WitnessReviewContract = {
    name: contract.title,
    id: contract.id,
    counterparty: contract.counterparty,
    effectiveDate: formatDate(contract.effectiveDate),
    status: humanizeStatus(contract.legalState ?? contract.businessStatus),
  };

  const witnessInfo: WitnessInfo = {
    name: witnessName ?? "Witness",
    role: "Independent Witness",
    email: witnessEmail ?? "",
  };

  // A real "security token" would just be the raw single-use token — which
  // must never be re-displayed after redemption. This is a safe, non-secret
  // reference derived from the contract id instead, kept in the same
  // visual format the mock used.
  const securityReference = `WV-${contract.id.slice(0, 8).toUpperCase()}`;
  const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const usedAtDisplay = usedAt
    ? new Date(usedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  function handleDownload() {
    window.open(contract.fileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <WitnessReviewHeader />

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6">

        {/* Page intro */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Secure witness review
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Review and witness this contract
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You have been invited as an independent witness. Please review the full contract below.
          </p>
        </div>

        {/* Contract info */}
        <ContractInfoCard contract={reviewContract} />

        {/* Document viewer */}
        <DocumentStateCard contract={contract} />

        {/* Access confirmation */}
        <WitnessAcknowledgementPanel
          witness={witnessInfo}
          contract={reviewContract}
          securityToken={securityReference}
          timezone={viewerTimezone}
          usedAt={usedAtDisplay}
          onDownload={handleDownload}
        />

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <WitnessReviewFooter />

    </div>
  );
}
