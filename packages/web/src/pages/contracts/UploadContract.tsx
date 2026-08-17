import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { UploadContractActionBar } from "../../components/layout/UploadContractActionBar";
import { ContractFileDropzone } from "../../components/shared/ContractFileDropzone";
import { SelectedFileSummary } from "../../components/shared/SelectedFileSummary";
import { UploadGuidelinesPanel } from "../../components/shared/UploadGuidelinesPanel";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  type ContractUploadStatus,
  useContractUpload,
} from "../../hooks/useContractUpload";
import {
  PENDING_PROCESSING_STATUSES,
  useContractDetail,
} from "../../hooks/useContractDetail";

export function UploadContract() {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    selectedFile,
    validationError,
    uploadError,
    uploadResult,
    status,
    isDragging,
    isUploading,
    selectFile,
    removeFile,
    setIsDragging,
    uploadSelectedFile,
    resetUpload,
  } = useContractUpload();

  // Once uploaded, poll the real contract record so the success screen
  // reflects live AI-extracted metadata instead of the static POST
  // response — which is always still placeholder values at the instant of
  // upload. Reuses useContractDetail's existing polling (Batch C) rather
  // than a second implementation; enabled: Boolean(id) inside that hook
  // means this is simply inert (and stops polling) once uploadResult
  // resets back to null on "Upload another contract."
  const { data: contract } = useContractDetail(uploadResult?.id);

  const canSubmit = Boolean(selectedFile) && !isUploading;

  async function handleSubmit() {
    if (isUploading) {
      return;
    }

    if (!selectedFile) {
      setSubmitError("Select a contract file before uploading.");
      return;
    }

    setSubmitError(null);
    await uploadSelectedFile();
  }

  function handleReset() {
    resetUpload();
    setSubmitError(null);
  }

  if (status === "success" && uploadResult) {
    const processingStatus =
      contract?.processingStatus ?? uploadResult.businessStatus;
    const isProcessing =
      !contract || PENDING_PROCESSING_STATUSES.has(processingStatus);
    const title = contract?.title ?? uploadResult.title;
    const counterparty = contract?.counterparty ?? uploadResult.counterparty;
    const legalState = contract?.legalState ?? uploadResult.legalState;
    return (
      <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col items-center justify-center py-10">
        <Card className="w-full min-w-0 text-center">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>

            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Contract uploaded
              </h1>
              <p className="text-muted-foreground">
                {isProcessing
                  ? "Extracting text and details from your document - this can take a moment."
                  : "Extraction and analysis complete."}
              </p>
            </div>

            <dl className="grid w-full min-w-0 grid-cols-1 gap-3 text-left sm:grid-cols-2">
              <SummaryItem label="Source" value="File" />
              <SummaryItem
                label="Contract"
                value={title}
                loading={isProcessing}
              />
              <SummaryItem
                label="Counterparty"
                value={counterparty}
                loading={isProcessing}
              />
              <SummaryItem
                label="Legal State"
                value={legalState ?? "Not specified"}
                loading={isProcessing}
              />
              <SummaryItem
                label="Uploaded"
                value={new Date(uploadResult.createdAt).toLocaleString()}
              />
            </dl>

            <Button type="button" variant="outline" onClick={handleReset}>
              Upload another contract
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Upload Contract</h1>
        {/* <p className="text-muted-foreground">
          Upload a contract file — Clausio extracts its title, counterparty,
          dates, and tags automatically.
        </p> */}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_280px] md:items-start xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6 flex flex-col justify-between h-full">
          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Contract Document</CardTitle>
                  <CardDescription>
                    Upload a contract file for secure storage and analysis.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="min-w-0 space-y-4">
              {selectedFile ? (
                <SelectedFileSummary
                  file={selectedFile}
                  disabled={isUploading}
                  onRemove={removeFile}
                  onReplace={removeFile}
                />
              ) : (
                <ContractFileDropzone
                  isDragging={isDragging}
                  error={validationError}
                  disabled={isUploading}
                  onSelectFile={(file) => {
                    setSubmitError(null);
                    selectFile(file);
                  }}
                  onDraggingChange={setIsDragging}
                />
              )}

              <p className="text-sm text-muted-foreground" aria-live="polite">
                {getStatusMessage(status, Boolean(selectedFile))}
              </p>
            </CardContent>
          </Card>

          {(submitError || uploadError) && (
            <div
              className="flex min-w-0 items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{submitError || uploadError}</p>
            </div>
          )}
          <UploadContractActionBar
            canSubmit={canSubmit}
            isUploading={isUploading}
            statusMessage={getActionStatusMessage(Boolean(selectedFile))}
            onReset={handleReset}
            onSubmit={handleSubmit}
          />
        </div>

        <aside className="min-w-0 self-start">
          <UploadGuidelinesPanel />
        </aside>
      </div>
    </div>
  );
}

function getActionStatusMessage(sourceIsValid: boolean): string {
  if (!sourceIsValid) {
    return "Select a contract file to continue.";
  }

  return "Ready to upload.";
}

function getStatusMessage(
  status: ContractUploadStatus,
  hasSelectedFile: boolean,
): string {
  if (status === "error") {
    return !hasSelectedFile
      ? "Choose another file to continue."
      : "Resolve the upload error before continuing.";
  }

  if (status === "ready") {
    return "File is ready to upload.";
  }

  if (status === "uploading") {
    return "Uploading contract.";
  }

  if (status === "success") {
    return "Contract uploaded successfully.";
  }

  return "No contract file selected yet.";
}

function SummaryItem({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className="truncate text-sm font-medium"
        title={loading ? undefined : value}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Extracting…
          </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
