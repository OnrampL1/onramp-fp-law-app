import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ContractsTable } from "@/components/contracts/ContractsTable";
import { Button } from "@/components/ui/button";
import { AlertCircle, Upload, X } from "lucide-react";

interface ContractsLocationState {
  notice?: string;
}

export default function Contracts() {
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>(
    (location.state as ContractsLocationState | null)?.notice ?? null,
  );

  return (
    <div className="space-y-6">
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-amber-700 transition-colors hover:text-amber-900"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

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
        <Button className="gap-2">
          <Upload className="size-4" />
          Upload Contract
        </Button>
      </div>

      {/* Filters + table */}
      <ContractsTable />
    </div>
  );
}
