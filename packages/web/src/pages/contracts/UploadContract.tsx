import { useState, type ElementType, type ReactNode } from "react";
import { CheckCircle2, ClipboardType, FileUp, XCircle } from "lucide-react";
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
import { Textarea } from "../../components/ui/textarea";
import {
  type ContractUploadStatus,
  useContractUpload,
} from "../../hooks/useContractUpload";
import {
  MIN_PASTED_CONTRACT_TEXT_LENGTH,
  type ContractMetadata,
} from "../../types/contracts";

type UploadInputMode = "file" | "paste";

const initialMetadata: ContractMetadata = {
  title: "",
  counterparty: "",
  tags: [],
  expirationDate: "",
  legalState: "",
};

export function UploadContract() {
  const [metadata, setMetadata] = useState<ContractMetadata>(initialMetadata);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<UploadInputMode>("file");
  const [pastedText, setPastedText] = useState("");

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
  const pastedTextIsValid =
    pastedText.trim().length >= MIN_PASTED_CONTRACT_TEXT_LENGTH;
  const sourceIsValid =
    inputMode === "file" ? Boolean(selectedFile) : pastedTextIsValid;
  const canSubmit = sourceIsValid && metadataIsValid && !isUploading;

  async function handleSubmit() {
    if (isUploading) {
      return;
    }

    if (!selectedFile) {
      setSubmitError("Select a contract file before uploading.");
      return;
    }

    if (!metadataIsValid) {
      setSubmitError("Add a contract title and counterparty before uploading.");
      return;
    }

    setSubmitError(null);
    await uploadSelectedFile(metadata);
  }

  function handleReset() {
    resetUpload();
    setMetadata(initialMetadata);
    setSubmitError(null);
    setInputMode("file");
    setPastedText("");
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
                {metadata.title || uploadResult.title} has been uploaded
                successfully.
              </p>
            </div>

            <dl className="grid w-full min-w-0 grid-cols-1 gap-3 text-left sm:grid-cols-2">
              <SummaryItem
                label="Source"
                value={inputMode === "file" ? "File" : "Pasted text"}
              />
              <SummaryItem label="Contract" value={uploadResult.title} />
              <SummaryItem label="Counterparty" value={metadata.counterparty} />
              <SummaryItem
                label="Legal State"
                value={uploadResult.legalState ?? "Not specified"}
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Contract Document</CardTitle>
                  <CardDescription>
                    Upload a file or paste contract text.
                  </CardDescription>
                </div>

                <div
                  className="inline-flex rounded-md border border-border p-1"
                  aria-label="Contract input mode"
                >
                  <ModeButton
                    active={inputMode === "file"}
                    disabled={isUploading}
                    icon={FileUp}
                    onClick={() => {
                      setInputMode("file");
                      setSubmitError(null);
                    }}
                  >
                    File
                  </ModeButton>

                  <ModeButton
                    active={inputMode === "paste"}
                    disabled={isUploading}
                    icon={ClipboardType}
                    onClick={() => {
                      setInputMode("paste");
                      setSubmitError(null);
                    }}
                  >
                    Paste
                  </ModeButton>
                </div>
              </div>
            </CardHeader>

            <CardContent className="min-w-0 space-y-4">
              {inputMode === "file" ? (
                selectedFile ? (
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
                )
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={pastedText}
                    disabled={isUploading}
                    placeholder="Paste the full contract text here..."
                    className="min-h-44 resize-y font-mono text-xs leading-relaxed"
                    onChange={(event) => {
                      setSubmitError(null);
                      setPastedText(event.target.value);
                    }}
                  />
                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    {pastedText.trim().length.toLocaleString()} characters
                    {pastedText.length > 0 && !pastedTextIsValid
                      ? " - paste at least 40 characters."
                      : ""}
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground" aria-live="polite">
                {getStatusMessage(status, inputMode, Boolean(selectedFile))}
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
          sourceIsValid,
          metadataIsValid,
          inputMode,
        )}
        onReset={handleReset}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function isMetadataValid(metadata: ContractMetadata): boolean {
  return (
    metadata.title.trim().length > 0 && metadata.counterparty.trim().length > 0
  );
}

function getActionStatusMessage(
  sourceIsValid: boolean,
  metadataIsValid: boolean,
  inputMode: UploadInputMode,
): string {
  if (!sourceIsValid) {
    return inputMode === "file"
      ? "Select a contract file to continue."
      : "Paste contract text to continue.";
  }

  if (!metadataIsValid) {
    return "Add the required contract metadata to continue.";
  }

  return "Ready to upload.";
}

function getStatusMessage(
  status: ContractUploadStatus,
  inputMode: UploadInputMode,
  hasSelectedFile: boolean,
): string {
  if (status === "error") {
    return inputMode === "file" && !hasSelectedFile
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

  return inputMode === "file"
    ? "No contract file selected yet."
    : "No contract text pasted yet.";
}

interface ModeButtonProps {
  active: boolean;
  disabled: boolean;
  icon: ElementType;
  children: ReactNode;
  onClick: () => void;
}

function ModeButton({
  active,
  disabled,
  icon: Icon,
  children,
  onClick,
}: ModeButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-sm bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
          : "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      }
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
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
