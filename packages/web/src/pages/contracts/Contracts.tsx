import { ContractsTable } from "@/components/contracts/ContractsTable";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import React from "react";

const Contracts = () => {
  return (
    <div className="flex min-h-svh bg-background">
      <main className="flex-1 space-y-6 p-4 md:p-6">
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
      </main>
    </div>
  );
};

export default Contracts;
