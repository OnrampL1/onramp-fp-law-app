import { PenLine } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ExportIcon, RefreshIcon } from "../shared/icons";

interface WitnessWorkflowHeaderProps {
  onExport?: () => void;
  isExporting?: boolean;
  exportError?: string | null;
  onRefresh?: () => void;
}

export function WitnessWorkflowHeader({
  onExport,
  isExporting,
  exportError,
  onRefresh,
}: WitnessWorkflowHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Title + subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <PenLine className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Witness Workflow</h1>
          <p className="text-sm text-muted-foreground">
            Manage witness invitations, secure access links, contract reviews, and witness activity.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onExport}
            disabled={isExporting}
          >
            <ExportIcon />
            {isExporting ? "Exporting…" : "Export Activity"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh}>
            <RefreshIcon />
            Refresh
          </Button>
        </div>
        {exportError && <p className="text-xs text-destructive">{exportError}</p>}
      </div>
    </div>
  );
}
