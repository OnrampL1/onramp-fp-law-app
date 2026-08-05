import { useNavigate } from "react-router-dom";
import { ContractsTable } from "@/components/contracts/ContractsTable";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function Contracts() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            Contracts
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor all contracts
          </p>
        </div>
        <Button
          type="button"
          className="gap-2"
          onClick={() => navigate("/upload")}
        >
          <Upload className="size-4" />
          Upload Contract
        </Button>
      </div>

      {/* Filters + table */}
      <ContractsTable />
    </div>
  );
}
