import { FileText, RefreshCw, X } from "lucide-react";
import { Button } from "../ui/button";
import { formatFileSize } from "../../lib/contract-file-validation";
import type { SelectedContractFile } from "../../types/contracts";

interface SelectedFileSummaryProps {
  file: SelectedContractFile;
  disabled?: boolean;
  onRemove: () => void;
  onReplace: () => void;
}

export function SelectedFileSummary({
  file,
  disabled = false,
  onRemove,
  onReplace,
}: SelectedFileSummaryProps) {
  const displayType =
    file.extension.length > 0
      ? file.extension.replace(".", "").toUpperCase()
      : file.type;

  return (
    <div
      className="min-w-0 rounded-md border border-border bg-card p-4"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={file.name}>
            {file.name}
          </p>

          <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <dt>Type:</dt>
              <dd>{displayType}</dd>
            </div>

            <div className="flex gap-1">
              <dt>Size:</dt>
              <dd>{formatFileSize(file.size)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onReplace}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Replace file
        </Button>

        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
        >
          <X className="mr-2 h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      </div>
    </div>
  );
}
