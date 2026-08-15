import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CircleSlash,
  Clock3,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePlatformOrganizations } from "../../hooks/usePlatformOrganizations";
import type {
  PlatformOrganizationListItem,
  PlatformOrganizationStatus,
} from "../../types/platform-organization";

const STATUS_OPTIONS: Array<PlatformOrganizationStatus | "ALL"> = [
  "ALL",
  "CREATED",
  "OWNER_ASSIGNED",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
];

const STATUS_LABELS: Record<PlatformOrganizationStatus, string> = {
  CREATED: "Created",
  OWNER_ASSIGNED: "Owner Assigned",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

function statusVariant(status: PlatformOrganizationStatus) {
  if (status === "ACTIVE") return "default";
  if (status === "SUSPENDED" || status === "ARCHIVED") return "destructive";
  return "secondary";
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getStats(organizations: PlatformOrganizationListItem[]) {
  return {
    total: organizations.length,
    active: organizations.filter((org) => org.status === "ACTIVE").length,
    needsOwner: organizations.filter((org) => org.status === "CREATED").length,
    suspended: organizations.filter((org) => org.status === "SUSPENDED").length,
  };
}

export function PlatformOrganizations() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlatformOrganizationStatus | "ALL">(
    "ALL",
  );
  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 50,
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(status !== "ALL" && { status }),
    }),
    [debouncedSearch, status],
  );

  const { data, isLoading, isError, refetch } =
    usePlatformOrganizations(queryParams);

  const organizations = data?.data ?? [];
  const pagination = data?.meta.pagination;
  const stats = getStats(organizations);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="size-4" />
            <span>Platform Console</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage tenant lifecycle and ownership from the platform layer.
          </p>
        </div>

        <Button disabled>New Organization</Button>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visible</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {pagination?.total ?? 0} total matching filters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Open workspaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Owner</CardTitle>
            <Clock3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.needsOwner}</div>
            <p className="text-xs text-muted-foreground">Created only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <CircleSlash className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.suspended}</div>
            <p className="text-xs text-muted-foreground">Access blocked</p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organizations or slugs"
            className="pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) =>
            setStatus(value as PlatformOrganizationStatus | "ALL")
          }
        >
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "ALL" ? "All statuses" : STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium">Unable to load organizations</p>
            <p className="text-sm text-muted-foreground">
              The platform directory could not be loaded.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : organizations.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No organizations found</p>
            <p className="text-sm text-muted-foreground">
              Adjust the filters or create an organization.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Contracts</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell>
                    <div className="font-medium">{organization.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {organization.slug}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(organization.status)}>
                      {STATUS_LABELS[organization.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {organization.owner ? (
                      <div>
                        <div className="text-sm font-medium">
                          {organization.owner.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {organization.owner.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not assigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      <Users className="size-3.5 text-muted-foreground" />
                      {organization.counts.members}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {organization.counts.contracts}
                  </TableCell>
                  <TableCell>{formatDate(organization.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
