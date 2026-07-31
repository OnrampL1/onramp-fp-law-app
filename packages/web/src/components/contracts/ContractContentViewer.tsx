import { Card } from "@/components/ui/card";
import { Loader2, FileWarning, FileText } from "lucide-react";
import { useContractContent } from "@/hooks/useContractDetail";
import type { ContractDetailResponse } from "@/types/contracts";

export function ContractContentViewer({
  contractId,
  processingStatus,
  processingError,
}: {
  contractId: string;
  processingStatus: ContractDetailResponse["processingStatus"];
  processingError: string | null;
}) {
  const { data, isLoading } = useContractContent(contractId);

  if (processingStatus === "PENDING_EXTRACTION") {
    return (
      <Card className="flex h-[calc(100svh-9rem)] min-h-[640px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p>Extracting document text — this can take a moment.</p>
      </Card>
    );
  }

  if (processingStatus === "EXTRACTION_FAILED") {
    return (
      <Card className="flex h-[calc(100svh-9rem)] min-h-[640px] flex-col items-center justify-center gap-3 p-8 text-center">
        <FileWarning className="size-6 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          Text extraction failed
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {processingError ?? "This file could not be processed."}
        </p>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="flex h-[calc(100svh-9rem)] min-h-[640px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p>Loading document content…</p>
      </Card>
    );
  }

  return (
    <Card className="flex h-[calc(100svh-9rem)] min-h-[640px] flex-col overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">
        <FileText className="size-4 text-primary" />
        Extracted Document Text
      </div>
      <div className="flex-1 overflow-auto p-6">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {data.extractedText}
        </pre>
      </div>
    </Card>
  );
}
