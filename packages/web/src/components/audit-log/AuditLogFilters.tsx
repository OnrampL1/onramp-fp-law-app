import { RotateCcw } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUP,
  AUDIT_ACTION_LABELS,
  type AuditAction,
  type AuditActionGroup,
} from "../../types/audit";
import type { ApiUser } from "../../services/users.service";
import type { ContractListItem } from "../../types/contracts";

interface AuditLogFiltersProps {
  actorUserId: string | "all";
  action: AuditAction | "all";
  contractId: string | "all";
  dateFrom: string;
  dateTo: string;
  filtersActive: boolean;
  users: ApiUser[];
  contracts: ContractListItem[];
  onActorUserIdChange: (value: string | "all") => void;
  onActionChange: (value: AuditAction | "all") => void;
  onContractIdChange: (value: string | "all") => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
}

const ACTION_GROUPS: AuditActionGroup[] = [
  "Organization",
  "User",
  "Contract",
  "Note",
  "Witness",
  "AI",
  "Platform",
];

export function AuditLogFilters({
  actorUserId,
  action,
  contractId,
  dateFrom,
  dateTo,
  filtersActive,
  users,
  contracts,
  onActorUserIdChange,
  onActionChange,
  onContractIdChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: AuditLogFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Actor</Label>
          <Select
            value={actorUserId}
            onValueChange={(v) => v !== null && onActorUserIdChange(v)}
          >
            <SelectTrigger size="sm" className="min-w-[10rem]" aria-label="Actor">
              <SelectValue placeholder="All actors">
                {(val) =>
                  val === "all"
                    ? "All actors"
                    : (users.find((u) => u.id === val)?.fullName ?? "All actors")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select value={action} onValueChange={(v) => v !== null && onActionChange(v as AuditAction | "all")}>
            <SelectTrigger size="sm" className="min-w-[12rem]" aria-label="Action">
              <SelectValue placeholder="All actions">
                {(val) => (val === "all" ? "All actions" : AUDIT_ACTION_LABELS[val as AuditAction])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTION_GROUPS.map((group) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {AUDIT_ACTIONS.filter((a) => AUDIT_ACTION_GROUP[a] === group).map((a) => (
                    <SelectItem key={a} value={a}>
                      {AUDIT_ACTION_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Contract</Label>
          <Select
            value={contractId}
            onValueChange={(v) => v !== null && onContractIdChange(v)}
          >
            <SelectTrigger size="sm" className="min-w-[10rem]" aria-label="Contract">
              <SelectValue placeholder="All contracts">
                {(val) =>
                  val === "all"
                    ? "All contracts"
                    : (contracts.find((c) => c.id === val)?.title ?? "All contracts")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contracts</SelectItem>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!filtersActive}
          className="gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
