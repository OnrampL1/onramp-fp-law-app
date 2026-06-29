import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { WarningIcon, ExtendIcon } from "./icons";
import type { ExpiringLink } from "./types";

interface ExpiringLinksPanelProps {
  links: ExpiringLink[];
}

const TABLE_HEADERS = ["Contract", "Witness", "Expiration Time", "Action"] as const;


export function ExpiringLinksPanel({ links }: ExpiringLinksPanelProps) {
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
          Witness links expiring within the next 24 hours.
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
              {links.map((link, i) => (
                <ExpiringLinkRow key={i} link={link} />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <ul className="divide-y divide-yellow-100 dark:divide-yellow-900/30 sm:hidden">
          {links.map((link, i) => (
            <ExpiringLinkCard key={i} link={link} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

function ExpiringLinkRow({ link }: { link: ExpiringLink }) {
  return (
    <tr>
      <td className="px-6 py-3">
        <p className="font-medium text-foreground">{link.contractName}</p>
        <p className="text-xs text-muted-foreground">{link.contractId}</p>
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-sm text-muted-foreground">
        {link.witnessName}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-sm text-yellow-700 dark:text-yellow-400 font-medium">
        {link.expirationTime}
      </td>
      <td className="px-6 py-3">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <ExtendIcon />
          Extend Access
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function ExpiringLinkCard({ link }: { link: ExpiringLink }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{link.contractName}</p>
          <p className="text-xs text-muted-foreground">{link.contractId}</p>
        </div>
        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
          {link.expirationTime}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{link.witnessName}</p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <ExtendIcon />
          Extend Access
        </Button>
      </div>
    </li>
  );
}