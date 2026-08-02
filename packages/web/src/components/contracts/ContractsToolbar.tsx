import {
  ContractExpirationBucket,
  ContractLegalStatus,
} from "@/types/contracts";
import { RotateCcw, Search } from "lucide-react";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";

interface ContractsToolbarProps {
  query: string;
  status: ContractLegalStatus | "all";
  tag: string;
  expiration: ContractExpirationBucket | "all";
  filtersActive: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: ContractLegalStatus | "all") => void;
  onTagChange: (value: string) => void;
  onExpirationChange: (value: ContractExpirationBucket | "all") => void;
  onReset: () => void;
}

export function ContractsToolbar({
  query,
  status,
  tag,
  expiration,
  filtersActive,
  onQueryChange,
  onStatusChange,
  onTagChange,
  onExpirationChange,
  onReset,
}: ContractsToolbarProps) {
  return (
    <div className="border-b border-border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
            }}
            placeholder="Search contracts or parties..."
            className="pl-9"
            aria-label="Search contracts"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={status}
            onChange={(v) => onStatusChange(v as ContractLegalStatus | "all")}
            placeholder="Status"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "DRAFT", label: "Draft" },
              { value: "ACTIVE", label: "Active" },
              { value: "EXPIRED", label: "Expired" },
              { value: "TERMINATED", label: "Terminated" },
            ]}
          />
          <Input
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
            placeholder="Filter by tag..."
            className="w-40"
            aria-label="Filter by tag"
          />
          <FilterSelect
            value={expiration}
            onChange={(v) =>
              onExpirationChange(v as ContractExpirationBucket | "all")
            }
            placeholder="Expiration"
            options={[
              { value: "all", label: "Any expiration" },
              { value: "expiring_30", label: "Next 30 days" },
              { value: "expiring_90", label: "Next 90 days" },
              { value: "expired", label: "Already expired" },
              { value: "none", label: "No expiration" },
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!filtersActive}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
    >
      <SelectTrigger
        size="sm"
        className="min-w-[8.5rem]"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder}>
          {(val) => options.find((o) => o.value === val)?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
