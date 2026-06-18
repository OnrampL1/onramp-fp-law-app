import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { StatusBadge } from "./statusbadge";
import { RiskBadge } from "./Riskbadge";
import { FileTextIcon } from "../icons";
import type { Contract } from "../types";

interface ContractTableProps {
  contracts: Contract[];
}

const TABLE_HEADERS = [
  "Contract Name",
  "Counterparty",
  "Status",
  "Expiration Date",
  "Risk Level",
  "Last Updated",
] as const;

/**
 * Responsive contract list.
 * - md+: full data table with six columns
 * - <md: stacked card list (no horizontal scroll)
 */
export function ContractTable({ contracts }: ContractTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Contracts</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Desktop table ── */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contracts.map((c) => (
                <ContractRow key={c.id} contract={c} />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <ul className="divide-y divide-border md:hidden">
          {contracts.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

function ContractRow({ contract: c }: { contract: Contract }) {
  return (
    <tr className="cursor-pointer transition-colors hover:bg-muted/30">
      {/* Name + meta */}
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          <FileTextIcon className="shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {c.id} · {c.type}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">{c.counterparty}</td>
      <td className="px-6 py-3">
        <StatusBadge status={c.status} />
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">
        {c.expirationDate ?? "—"}
      </td>
      <td className="px-6 py-3">
        <RiskBadge level={c.riskLevel} />
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">{c.lastUpdated}</td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function ContractCard({ contract: c }: { contract: Contract }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.counterparty}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <RiskBadge level={c.riskLevel} />
        {c.expirationDate && <span>Exp: {c.expirationDate}</span>}
        <span>{c.lastUpdated}</span>
      </div>
    </li>
  );
}