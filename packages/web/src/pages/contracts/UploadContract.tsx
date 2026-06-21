import { useState } from "react";
import { ContractFileDropzone } from "../../components/shared/ContractFileDropzone";
import { ContractMetadataForm } from "../../components/shared/ContractMetadataForm";
import { SelectedFileSummary } from "../../components/shared/SelectedFileSummary";
import { UploadGuidelinesPanel } from "../../components/shared/UploadGuidelinesPanel";
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

  const {
    selectedFile,
    validationError,
    status,
    isDragging,
    isUploading,
    selectFile,
    removeFile,
    setIsDragging,
  } = useContractUpload();

  const hasSelectedFile = Boolean(selectedFile);

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
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
                  onSelectFile={selectFile}
                  onDraggingChange={setIsDragging}
                />
              )}

              <p className="text-sm text-muted-foreground" aria-live="polite">
                {getStatusMessage(status, hasSelectedFile)}
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
                onChange={setMetadata}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0">
          <UploadGuidelinesPanel />
        </aside>
      </div>
    </div>
  );
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
