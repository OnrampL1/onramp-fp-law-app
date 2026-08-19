import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { UploadIcon } from "../shared/icons";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userName}. Here's what's happening across your
          contracts.
        </p>
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
