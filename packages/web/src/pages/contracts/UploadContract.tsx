import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { UploadContractActionBar } from "../../components/layout/UploadContractActionBar";
import { ContractFileDropzone } from "../../components/shared/ContractFileDropzone";
import { ContractMetadataForm } from "../../components/shared/ContractMetadataForm";
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
import type { ContractMetadata } from "../../types/contracts";

const initialMetadata: ContractMetadata = {
  title: "",
  counterparty: "",
  contractType: "",
  tags: [],
  effectiveDate: "",
  expirationDate: "",
  status: "draft",
};

export function UploadContract() {
  const [metadata, setMetadata] = useState<ContractMetadata>(initialMetadata);
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

  const metadataIsValid = isMetadataValid(metadata);
  const canSubmit = Boolean(selectedFile) && metadataIsValid && !isUploading;

  async function handleSubmit() {
    if (isUploading) {
      return;
    }

    if (!selectedFile) {
      setSubmitError("Select a contract file before uploading.");
      return;
    }

    if (!metadataIsValid) {
      setSubmitError(
        "Add a contract title, counterparty, and contract type before uploading.",
      );
      return;
    }

    setSubmitError(null);
    await uploadSelectedFile();
  }

  function handleReset() {
    resetUpload();
    setMetadata(initialMetadata);
    setSubmitError(null);
  }

  if (status === "success" && uploadResult) {
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
                {metadata.title || uploadResult.fileName} has been uploaded
                successfully.
              </p>
            </div>

            <dl className="grid w-full min-w-0 grid-cols-1 gap-3 text-left sm:grid-cols-2">
              <SummaryItem label="File" value={uploadResult.fileName} />
              <SummaryItem label="Counterparty" value={metadata.counterparty} />
              <SummaryItem label="Status" value={metadata.status} />
              <SummaryItem
                label="Uploaded"
                value={new Date(uploadResult.uploadedAt).toLocaleString()}
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
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 pb-24">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Upload Contract</h1>
        <p className="text-muted-foreground">
          Upload and prepare a new legal agreement for analysis.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Contract Document</CardTitle>
              <CardDescription>
                Upload a PDF, DOC, DOCX, or TXT contract file up to 25 MB.
              </CardDescription>
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

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Contract Metadata</CardTitle>
              <CardDescription>
                Describe the agreement before uploading.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContractMetadataForm
                value={metadata}
                disabled={isUploading}
                onChange={(nextMetadata) => {
                  setSubmitError(null);
                  setMetadata(nextMetadata);
                }}
              />
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
        </div>

        <aside className="min-w-0">
          <UploadGuidelinesPanel />
        </aside>
      </div>

      <UploadContractActionBar
        canSubmit={canSubmit}
        isUploading={isUploading}
        statusMessage={getActionStatusMessage(
          Boolean(selectedFile),
          metadataIsValid,
        )}
        onReset={handleReset}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function isMetadataValid(metadata: ContractMetadata): boolean {
  return (
    metadata.title.trim().length > 0 &&
    metadata.counterparty.trim().length > 0 &&
    metadata.contractType.length > 0
  );
}

function getActionStatusMessage(
  hasSelectedFile: boolean,
  metadataIsValid: boolean,
): string {
  if (!hasSelectedFile) {
    return "Select a contract file to continue.";
  }

  if (!metadataIsValid) {
    return "Add the required contract metadata to continue.";
  }

  return "Ready to upload.";
}

function getStatusMessage(
  status: ContractUploadStatus,
  hasSelectedFile: boolean,
): string {
  if (status === "error") {
    return hasSelectedFile
      ? "Resolve the upload error before continuing."
      : "Choose another file to continue.";
  }

  if (status === "ready") {
    return "File is ready to upload.";
  }

  if (status === "uploading") {
    return "Uploading contract file.";
  }

  if (status === "success") {
    return "Contract uploaded successfully.";
  }

  return "No contract file selected yet.";
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}
