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
import {
  useWitnessPortal,
  type WitnessPortalErrorKind,
} from "@/hooks/useWitnessPortal";
import { formatDate } from "@/lib/utils";
import type {
  DocumentPage,
  WitnessInfo,
  WitnessReviewContract,
} from "../components/witness-review/types";
import type { WitnessPortalContract } from "@/types/witness-portal";

function humanizeStatus(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// A numbered clause heading on its own line - "1. PURPOSE", "12. TERM" - is
// the standard convention extracted contract text uses for its clause list.
// Requiring the heading text to be all-uppercase (vs. a numbered sentence
// like "1. The Parties shall...") is what keeps this from misfiring on
// ordinary numbered prose.
const CLAUSE_HEADING_LINE = /^(\d{1,3})\.\s+([A-Z][A-Z0-9 &\-/,']*)$/;

// A standalone "SIGNATURES" / "SIGNATURE" line is the conventional marker
// for where a contract's signature block starts - never part of a clause's
// own substance, so it's treated as a hard section break the same way a
// numbered clause heading is.
const SIGNATURE_BLOCK_LINE = /^SIGNATURES?$/i;

// A synthetic "CONTRACT <n>:" marker some extraction/seed pipelines prepend
// ahead of the document's own title - never real contract text, safe to
// drop outright regardless of the number.
const CONTRACT_NUMBER_PREFIX_LINE = /^CONTRACT\s+\d+\s*:/i;

// A line of all-caps text (3+ letters, no lowercase) is how a document's own
// title/heading conventionally appears in its first line(s) - e.g. "MUTUAL
// NON-DISCLOSURE AGREEMENT". The page already shows a title above the
// document body, so echoing the document's own caps title again inside it
// just reads as a duplicate.
function isAllCapsHeadingLine(line: string): boolean {
  if (!line || /[a-z]/.test(line)) return false;
  return (line.match(/[A-Z]/g)?.length ?? 0) >= 3;
}

// A numbered clause heading ("13. GENERAL") or the signature-block marker
// also happens to satisfy isAllCapsHeadingLine's own "no lowercase" test -
// front-matter stripping must never treat either as a strippable title,
// since both are real, substantive section headings, not an echo of the
// document's own name.
function isRealSectionHeadingLine(line: string): boolean {
  return CLAUSE_HEADING_LINE.test(line) || SIGNATURE_BLOCK_LINE.test(line);
}

// Drops a leading "CONTRACT <n>:" marker (however many physical lines its
// wrapped title spans, up to a small safety bound) together with whatever
// standalone all-caps title line follows it, and — independent of any
// marker — drops a standalone all-caps title line that opens the document
// on its own. Only ever touches the very start of the document: the moment
// a normal content line is seen, front-matter stripping stops for good, so
// nothing deeper in the document (e.g. an all-caps "IN WITNESS WHEREOF"
// nearer the signature block) is touched. Generic by construction — no
// contract-specific text is matched, so this applies the same way to every
// contract's extracted text, not just one.
function stripTitleFrontMatter(lines: string[]): string[] {
  const result: string[] = [];
  let inFrontMatter = true;
  let strippingContractPrefix = false;
  let contractPrefixLinesSeen = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!inFrontMatter || !line) {
      result.push(rawLine);
      continue;
    }

    if (strippingContractPrefix) {
      contractPrefixLinesSeen += 1;
      if (isRealSectionHeadingLine(line)) {
        strippingContractPrefix = false;
        inFrontMatter = false;
        result.push(rawLine);
        continue;
      }
      if (isAllCapsHeadingLine(line)) {
        inFrontMatter = false; // this caps line is itself the title echo
        continue;
      }
      if (contractPrefixLinesSeen <= 4) {
        continue; // still consuming the wrapped "CONTRACT n: <title>" line
      }
      // Safety valve: didn't find a caps line within a few lines, so this
      // wasn't the pattern expected - stop stripping and fall through.
      strippingContractPrefix = false;
      inFrontMatter = false;
      result.push(rawLine);
      continue;
    }

    if (CONTRACT_NUMBER_PREFIX_LINE.test(line)) {
      strippingContractPrefix = true;
      contractPrefixLinesSeen = 1;
      continue;
    }

    if (isAllCapsHeadingLine(line) && !isRealSectionHeadingLine(line)) {
      inFrontMatter = false;
      continue;
    }

    inFrontMatter = false;
    result.push(rawLine);
  }

  return result;
}

// extractedText is a flat string (no page/section structure from the AI
// extraction pipeline). Splitting only on blank lines (the previous
// approach) doesn't help when a document's clauses are separated by single
// newlines with no blank line between them, as real extracted contracts
// often are — every clause then collapses into one unbroken block of text
// with its "1. PURPOSE" / "2. CONTRIBUTIONS" markers buried inline instead
// of standing out. Detecting the clause-heading lines themselves as hard
// section breaks (in addition to still respecting blank lines within a
// clause) gives each clause its own heading + paragraph, however the
// source text is wrapped.
function parseDocumentSections(extractedText: string) {
  const lines = stripTitleFrontMatter(extractedText.trim().split("\n"));

  const blocks: { heading: string; paragraphWords: string[][] }[] = [
    { heading: "", paragraphWords: [[]] },
  ];
  // Once the signature block starts, each party's own name line (also
  // all-caps, e.g. "HARFOUSH LAW GROUP") is treated as a further section
  // break too, so each party's By/Name/Title/Date fields end up as their
  // own paragraph instead of every party running together into one block.
  // Scoped to after "SIGNATURES" specifically - an all-caps line earlier in
  // an ordinary clause is left alone.
  let inSignatureBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const block = blocks[blocks.length - 1];
    const currentParagraph =
      block.paragraphWords[block.paragraphWords.length - 1];

    if (!line) {
      if (currentParagraph.length > 0) {
        block.paragraphWords.push([]);
      }
      continue;
    }

    const headingMatch = line.match(CLAUSE_HEADING_LINE);
    if (headingMatch) {
      inSignatureBlock = false;
      blocks.push({
        heading: `${headingMatch[1]}. ${headingMatch[2]}`,
        paragraphWords: [[]],
      });
      continue;
    }

    if (SIGNATURE_BLOCK_LINE.test(line)) {
      inSignatureBlock = true;
      blocks.push({ heading: line, paragraphWords: [[]] });
      continue;
    }

    if (inSignatureBlock && isAllCapsHeadingLine(line)) {
      blocks.push({ heading: line, paragraphWords: [[]] });
      continue;
    }

    currentParagraph.push(line);
  }

  return blocks
    .map((block) => ({
      heading: block.heading,
      paragraphs: block.paragraphWords
        .map((words) => words.join(" ").trim())
        .filter(Boolean),
    }))
    .filter((section) => section.heading || section.paragraphs.length > 0);
}

// Wrapped as a single synthetic "page" so the existing search/zoom viewer
// still works over the real contract text instead of needing a second,
// simpler viewer built just for this case.
function buildDocumentPages(contract: WitnessPortalContract): DocumentPage[] {
  const sections = contract.extractedText
    ? parseDocumentSections(contract.extractedText)
    : [];

  return [
    {
      pageNumber: 1,
      totalPages: 1,
      title: contract.title,
      sections: sections.length
        ? sections
        : [
            {
              heading: "",
              paragraphs: [
                "No extracted text is available for this contract yet.",
              ],
            },
          ],
    },
  ];
}

// Mirrors ContractContentViewer.tsx's pending/failed handling for the
// internal contract viewer — a witness only cares whether text extraction
// itself succeeded, never how far the (internal-only) AI analysis has
// gotten, so every other processingStatus falls through to the real viewer.
function DocumentStateCard({ contract }: { contract: WitnessPortalContract }) {
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
    description:
      "Double-check the link you were sent — it may have been mistyped or truncated.",
  },
  expired: {
    icon: Clock3,
    title: "This witness link has expired",
    description: "Contact whoever sent you this link to request a new one.",
  },
  revoked: {
    icon: ShieldOff,
    title: "Access to this contract has been revoked",
    description:
      "The organization that sent you this link has revoked access. Contact them if you believe this is a mistake.",
  },
  used: {
    icon: Ban,
    title: "This witness link has already been used",
    description:
      "Witness links are single-use. If you need access again, contact whoever sent it to request a new link.",
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
        <p className="text-sm text-muted-foreground">
          {message ?? copy.description}
        </p>
        {onRetry && kind === "unknown" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
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
  const { data, isLoading, isError, errorInfo, refetch } =
    useWitnessPortal(token);

  if (!token) {
    return <ProblemScreen kind="not-found" />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <WitnessReviewHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:px-6">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Verifying your access…
          </p>
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
    ? new Date(usedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  // Same-origin streaming route, not a presigned MinIO URL — MinIO has no
  // public hostname (by design), so a presigned URL handed straight to the
  // browser would DNS-fail. No contract id in the path: the witness session
  // cookie (set on link redemption) already scopes the request server-side.
  function handleDownload() {
    window.open("/api/witness/contract/file", "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <WitnessReviewHeader
        organizationName={contract.organizationName}
        organizationLogoUrl={contract.organizationLogoUrl}
      />

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
            You have been invited as an independent witness. Please review the
            full contract below.
          </p>
        </div>

        {/* Single-use warning — opening this page already redeemed the link
            (see WitnessAcknowledgementPanel below), so this is the witness's
            only window; closing it loses access for good rather than just
            pausing it. */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50 p-4 text-sm dark:border-amber-700/30 dark:bg-amber-900/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-300">
            <span className="font-semibold">This link is single-use. </span>
            If you close this page before you're done, you won't be able to
            reopen it, and you'll need to contact whoever sent it to request a
            new witness link.
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
