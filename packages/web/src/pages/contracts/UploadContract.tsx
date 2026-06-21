import { ContractFileDropzone } from "../../components/shared/ContractFileDropzone";
import { SelectedFileSummary } from "../../components/shared/SelectedFileSummary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useContractUpload } from "../../hooks/useContractUpload";

export function UploadContract() {
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
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Upload Contract</h1>
        <p className="text-muted-foreground">
          Select a contract file to prepare it for upload.
        </p>
      </div>

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
    </div>
  );
}

function getStatusMessage(status: string, hasSelectedFile: boolean): string {
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
