import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { RiskBadge } from "./RiskBadge";
import { CalendarIcon } from "../icons";
import type { ExpiringContract } from "../types";

interface ExpiringContractsListProps {
  contracts: ExpiringContract[];
}


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
  const navigate = useNavigate();

  /* Temporary slug until real IDs arrive from the API. Replace with c.id once ExpiringContract includes an id field */
  const slug = c.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/contracts/${slug}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/contracts/${slug}`)}
      className="flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
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