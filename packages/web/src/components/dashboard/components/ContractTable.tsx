import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";
import { FileTextIcon, ChevronRightIcon } from "../icons";
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
 *
 * Clicking any row navigates to /contracts/:id  → PlaceholderPage (for now).
 * "See All Contracts" navigates to /contracts   → PlaceholderPage (for now).
 *
 * When the real pages are ready:
 *   - Register <ContractDetailPage /> at /contracts/:id in your router.
 *   - Register <ContractsPage />       at /contracts     in your router.
 *   - No changes needed in this file.
 */
export function ContractTable({ contracts }: ContractTableProps) {
  const navigate = useNavigate();

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
                {/* Empty header for the chevron column */}
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contracts.map((c) => (
                <ContractRow
                  key={c.id}
                  contract={c}
                  onClick={() => navigate(`/contracts/${c.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <ul className="divide-y divide-border md:hidden">
          {contracts.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              onClick={() => navigate(`/contracts/${c.id}`)}
            />
          ))}
        </ul>

        {/* ── See all footer ── */}
        <div className="flex items-center justify-center border-t border-border px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/contracts")}
          >
            See All Contracts
            <ChevronRightIcon className="ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

interface RowProps {
  contract: Contract;
  onClick: () => void;
}

function ContractRow({ contract: c, onClick }: RowProps) {
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
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
      {/* Chevron */}
      <td className="px-4 py-3">
        <ChevronRightIcon className="text-muted-foreground" />
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function ContractCard({ contract: c, onClick }: RowProps) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="flex cursor-pointer flex-col gap-2 px-4 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
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