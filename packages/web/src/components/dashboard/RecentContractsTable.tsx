import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { recentContracts } from "@/lib/data";
import { ArrowRight, FileText } from "lucide-react";
import { RiskBadge, StatusBadge } from "../ui/badges";
import { Link, useNavigate } from "react-router-dom";

export function RecentContracts() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Recent Contracts</CardTitle>
          <CardDescription>
            Latest activity across your contract portfolio
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate("/contracts")}
        >
          View all
          <ArrowRight className="size-4" />
        </Button>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Contract Name</TableHead>
              <TableHead>Counterparty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiration Date</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead className="text-right">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentContracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/contracts/${c.id}`}
                        className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.id} · {c.type}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.counterparty}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.expiration}
                </TableCell>
                <TableCell>
                  <RiskBadge risk={c.risk} />
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {c.updated}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
