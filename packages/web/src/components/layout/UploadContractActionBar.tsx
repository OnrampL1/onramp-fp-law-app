import { CheckCircle2, Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "../ui/button";

interface UploadContractActionBarProps {
  canSubmit: boolean;
  isUploading: boolean;
  statusMessage: string;
  onReset: () => void;
  onSubmit: () => void;
}

export function UploadContractActionBar({
  canSubmit,
  isUploading,
  statusMessage,
  onReset,
  onSubmit,
}: UploadContractActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm text-muted-foreground" aria-live="polite">
          {isUploading ? (
            <span className="inline-flex min-w-0 items-center gap-2 text-foreground">
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin"
                aria-hidden="true"
              />
              Uploading contract...
            </span>
          ) : canSubmit ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {statusMessage}
            </span>
          ) : (
            statusMessage
          )}
        </p>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            disabled={isUploading}
            onClick={onReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>

          <Button
            type="button"
            disabled={!canSubmit || isUploading}
            onClick={onSubmit}
          >
            {isUploading ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Uploading
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Upload Contract
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
