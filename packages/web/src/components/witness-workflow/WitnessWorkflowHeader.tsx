import { Button } from "../../components/ui/button";
import { ExportIcon, RefreshIcon, PlusIcon } from "../shared/icons";

interface WitnessWorkflowHeaderProps {
  onExport?: () => void;
  onRefresh?: () => void;
  onGenerate?: () => void;
}

export function WitnessWorkflowHeader({
  onExport,
  onRefresh,
  onGenerate,
}: WitnessWorkflowHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      {/* Title + subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Witness Workflow</h1>
        <p className="text-sm text-muted-foreground">
          Manage witness invitations, secure access links, contract reviews, and witness activity.
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onExport}>
          <ExportIcon />
          Export Activity
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh}>
          <RefreshIcon />
          Refresh
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onGenerate}>
          <PlusIcon />
          Generate Witness Link
        </Button>
      </div>
    </div>
  );
}
