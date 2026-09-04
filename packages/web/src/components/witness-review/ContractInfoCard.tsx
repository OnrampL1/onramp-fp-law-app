import { Card, CardContent } from "../../components/ui/card";
import {
  FileTextIcon,
  CounterpartyIcon,
  CalendarIcon,
  StatusIcon,
} from "../shared/icons";
import type { WitnessReviewContract } from "./types";

interface ContractInfoCardProps {
  contract: WitnessReviewContract;
}

/**
 * Displays the contract being reviewed:
 * - Name (the witness's own access is already confirmed by having reached
 *   this page - a "pending" badge here would describe the witness's own
 *   access back to them, not a real status)
 * - 3 metadata fields: counterparty, effective date, status - name and id
 *   are not repeated here, the name already appears right above and the
 *   internal contract id isn't meaningful to a witness
 */
export function ContractInfoCard({ contract }: ContractInfoCardProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* ── Top row: name ── */}
        <div className="flex items-center gap-3 border-b border-border p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileTextIcon />
          </div>
          <p className="font-semibold text-foreground">{contract.name}</p>
        </div>

        {/* ── Bottom row: 3 metadata fields ── */}
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
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
