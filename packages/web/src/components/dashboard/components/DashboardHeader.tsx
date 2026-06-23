import { Button } from "../../../components/ui/button";
import { SparklesIcon, UploadIcon } from "../icons";

interface DashboardHeaderProps {
  userName: string;
}

/**
 * Page header with a contextual welcome line and two primary actions.
 * Stacks vertically on mobile, aligns to a row on sm+.
 */
export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Title + subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userName}. Here's what's happening across your contracts.
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <SparklesIcon />
          Run AI Analysis
        </Button>
        <Button size="sm" className="gap-1.5">
          <UploadIcon />
          Upload Contract
        </Button>
      </div>
    </div>
  );
}