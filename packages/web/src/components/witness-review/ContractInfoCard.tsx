import { Card, CardContent } from "../../components/ui/card";
import {
  FileTextIcon,
  ContractNameIcon,
  CounterpartyIcon,
  CalendarIcon,
  StatusIcon,
} from "./icons";
import type { WitnessReviewContract } from "./types";

interface ContractInfoCardProps {
  contract: WitnessReviewContract;
}

/**
 * Displays the contract being reviewed:
 * - Name + ID with an "Awaiting Witness Acknowledgement" status pill
 * - 4 metadata fields: contract name, counterparty, effective date, status
 */
export function ContractInfoCard({ contract }: ContractInfoCardProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* ── Top row: name + status badge ── */}
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileTextIcon />
            </div>
            <div>
              <p className="font-semibold text-foreground">{contract.name}</p>
              <p className="text-xs text-muted-foreground">{contract.id}</p>
            </div>
          </div>

          {/* Awaiting badge — reuses same pill pattern as WitnessStatusBadge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/50 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700 dark:border-yellow-700/30 dark:bg-yellow-900/20 dark:text-yellow-400">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Awaiting Witness Acknowledgement
          </span>
        </div>

        {/* ── Bottom row: 4 metadata fields ── */}
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <MetaField
            icon={<ContractNameIcon />}
            label="Contract name"
            value={contract.name}
          />
          <MetaField
            icon={<CounterpartyIcon />}
            label="Counterparty"
            value={contract.counterparty}
          />
          <MetaField
            icon={<CalendarIcon />}
            label="Effective date"
            value={contract.effectiveDate}
          />
          <MetaField
            icon={<StatusIcon />}
            label="Status"
            value={contract.status}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Meta field ───────────────────────────────────────────────────────────────

interface MetaFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetaField({ icon, label, value }: MetaFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}