import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { Button } from "../ui/button";
import { UploadIcon } from "../shared/icons";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutDashboard className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {userName}. Here's what's happening across your
            contracts.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => navigate("/upload")}
        >
          <UploadIcon />
          Upload Contract
        </Button>
      </div>
    </div>
  );
}
