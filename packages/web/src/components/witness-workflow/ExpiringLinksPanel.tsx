import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { WarningIcon } from "../shared/icons";
import { formatRelativeTime } from "@/lib/utils";
import type { WitnessLinkListItem } from "@/types/witness";

interface ExpiringLinksPanelProps {
  /** Pre-filtered by the caller to status === "pending" links expiring within 24h. */
  links: WitnessLinkListItem[];
  onRevoke: (invitation: WitnessLinkListItem) => void;
}

const TABLE_HEADERS = ["Contract", "Witness", "Expires", "Action"] as const;

export function ExpiringLinksPanel({ links, onRevoke }: ExpiringLinksPanelProps) {
  if (links.length === 0) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50/40 dark:border-yellow-900/40 dark:bg-yellow-900/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <WarningIcon className="text-yellow-600 dark:text-yellow-400" />
          <CardTitle className="text-base font-semibold text-yellow-800 dark:text-yellow-300">
            Expiring Links
          </CardTitle>
        </div>
        <CardDescription className="text-yellow-700 dark:text-yellow-400">
          Pending witness links expiring within the next 24 hours.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Desktop table ── */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-yellow-200 dark:border-yellow-900/40">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium text-yellow-700 dark:text-yellow-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-yellow-100 dark:divide-yellow-900/30">
              {links.map((link) => (
                <ExpiringLinkRow key={link.id} link={link} onRevoke={onRevoke} />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <ul className="divide-y divide-yellow-100 dark:divide-yellow-900/30 sm:hidden">
          {links.map((link) => (
            <ExpiringLinkCard key={link.id} link={link} onRevoke={onRevoke} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

interface RowProps {
  link: WitnessLinkListItem;
  onRevoke: (invitation: WitnessLinkListItem) => void;
}

function ExpiringLinkRow({ link, onRevoke }: RowProps) {
  return (
    <tr>
      <td className="px-6 py-3">
        <p className="font-medium text-foreground">{link.contractTitle}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{link.contractId.slice(0, 8)}…</p>
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-sm text-muted-foreground">
        {link.witnessName ?? link.witnessEmail}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-sm text-yellow-700 dark:text-yellow-400 font-medium">
        {formatRelativeTime(link.expiresAt)}
      </td>
      <td className="px-6 py-3">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onRevoke(link)}>
          Revoke
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function ExpiringLinkCard({ link, onRevoke }: RowProps) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{link.contractTitle}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{link.contractId.slice(0, 8)}…</p>
        </div>
        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
          {formatRelativeTime(link.expiresAt)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{link.witnessName ?? link.witnessEmail}</p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onRevoke(link)}>
          Revoke
        </Button>
      </div>
    </li>
  );
}
