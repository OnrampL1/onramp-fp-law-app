import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { RiskBadge } from "./Riskbadge";
import { CalendarIcon } from "../icons";
import type { ExpiringContract } from "../types";

interface ExpiringContractsListProps {
  contracts: ExpiringContract[];
}

/**
 * Ordered list of contracts approaching their expiration date.
 * Each row shows a "days remaining" pill, contract name, counterparty, and risk level.
 */
export function ExpiringContractsList({ contracts }: ExpiringContractsListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Expiring Contracts</CardTitle>
        </div>
        <CardDescription>Contracts approaching their expiration date</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {contracts.map((c, i) => (
            <ExpiringContractRow key={i} contract={c} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function ExpiringContractRow({ contract: c }: { contract: ExpiringContract }) {
  return (
    <li className="flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/40">
      {/* Days pill */}
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted py-1.5 text-center">
        <span className="text-lg font-bold leading-none">{c.daysLeft}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          days
        </span>
      </div>

      {/* Name + counterparty */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{c.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {c.counterparty}
          {c.value ? ` · ${c.value}` : ""}
        </p>
      </div>

      <RiskBadge level={c.risk} />
    </li>
  );
}