import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badges";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { ContractRowActions } from "./ContractRowActions";
import type { ContractListItem, ContractLegalStatus } from "@/types/contracts";
import type { ContractStatus } from "@/lib/data";

const STATUS_LABELS: Record<ContractLegalStatus, ContractStatus> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

interface ContractRowProps {
  contract: ContractListItem;
}

export function ContractRow({ contract: c }: ContractRowProps) {
  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <FileText className="size-4" />
          </div>
          <Link
            to={`/contracts/${c.id}`}
            className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
          >
            {c.title}
          </Link>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{c.counterparty}</TableCell>
      <TableCell>
        {c.status ? (
          <StatusBadge status={STATUS_LABELS[c.status]} />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(c.effectiveDate)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(c.expirationDate)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatRelativeTime(c.updatedAt)}
      </TableCell>
      <TableCell className="text-right">
        <ContractRowActions id={c.id} />
      </TableCell>
    </TableRow>
  );
}
