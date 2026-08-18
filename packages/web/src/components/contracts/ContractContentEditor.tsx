import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useContractContent,
  useContractDetail,
  useUpdateContractContent,
} from "@/hooks/useContractDetail";

// Own save action, own version-conflict handling, deliberately separate
// from ContractEditForm's "Save Changes" — mirrors the backend split
// (PUT /:id/content vs PUT /:id/metadata) rather than forcing a metadata
// save whenever someone just wants to fix a text typo.
export function ContractContentEditor({
  contractId,
  onDirtyChange,
}: {
  contractId: string;
  onDirtyChange?: (isDirty: boolean) => void;
}) {
  const { data: contract } = useContractDetail(contractId);
  const { data: content, isLoading } = useContractContent(contractId);
  const updateMutation = useUpdateContractContent(contractId);

  const [text, setText] = useState<string | null>(null);

  // Same discipline as ContractEdit's form: initialize once, never
  // re-sync on a background refetch (that would silently discard an
  // in-progress edit). Reload button below is the only other reset path.
  useEffect(() => {
    if (content && text === null) {
      setText(content.extractedText ?? "");
    }
  }, [content, text]);

  useEffect(() => {
    if (!content) return;
    onDirtyChange?.(text !== null && text !== (content.extractedText ?? ""));
  }, [text, content, onDirtyChange]);

  const saveErrorStatus = isAxiosError(updateMutation.error)
    ? updateMutation.error.response?.status
    : undefined;
  const showConflictBanner = saveErrorStatus === 409;
  const showGenericSaveError =
    updateMutation.isError && saveErrorStatus !== 409;

  function handleReload() {
    if (content) {
      setText(content.extractedText ?? "");
    }
    updateMutation.reset();
  }

  function handleSave() {
    if (text === null || !contract) return;

    updateMutation.mutate({
      extractedText: text,
      version: contract.version,
    });
  }

  if (isLoading || !content) {
    return (
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Extracted Text
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading extracted text…
        </div>
      </Card>
    );
  }

  if (content.processingStatus === "PENDING_EXTRACTION") {
    return (
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Extracted Text
        </h2>
        <p className="text-sm text-muted-foreground">
          Extraction hasn't finished yet — check back once it completes.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Extracted Text
        </h2>
        <Button
          type="button"
          size="sm"
          disabled={updateMutation.isPending || text === null}
          onClick={handleSave}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Text"
          )}
        </Button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Editing this re-runs AI Summary, Risk, and Metadata analysis against
        the corrected text.
        {content.processingStatus === "EXTRACTION_FAILED" &&
          " Automated extraction failed for this document — pasting the text in manually is the only way to enable analysis."}
      </p>

      {showConflictBanner && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                This contract was updated by someone else
              </p>
              <p className="text-amber-800">
                Reload to see the latest version before saving your changes.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-300 bg-transparent text-amber-900 hover:bg-amber-100"
              onClick={handleReload}
            >
              Reload
            </Button>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-amber-700 transition-colors hover:text-amber-900"
              onClick={() => updateMutation.reset()}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {showGenericSaveError && (
        <p className="mb-4 text-sm text-destructive">
          Unable to save changes. Please try again.
        </p>
      )}

      <Textarea
        value={text ?? ""}
        disabled={updateMutation.isPending}
        onChange={(event) => setText(event.target.value)}
        className="min-h-[420px] font-mono text-xs leading-relaxed"
      />
    </Card>
  );
}
