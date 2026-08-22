import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AxiosError } from "axios";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Search,
  XCircle,
  Loader2,
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
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { cn } from "../../lib/utils";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePlatformAuth } from "../../hooks/usePlatformAuth";
import {
  useApprovePlatformAccessRequest,
  useDeclinePlatformAccessRequest,
  usePlatformAccessRequest,
  usePlatformAccessRequests,
} from "../../hooks/usePlatformAccessRequests";
import type {
  PlatformAccessRequest,
  PlatformAccessRequestStatus,
} from "../../types/platform-access-request";

const STATUS_OPTIONS: Array<PlatformAccessRequestStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "DECLINED",
];

const STATUS_LABELS: Record<PlatformAccessRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

const COMPANY_SIZE_LABELS: Record<string, string> = {
  ONE_TO_TEN: "1-10",
  ELEVEN_TO_FIFTY: "11-50",
  FIFTY_ONE_TO_TWO_HUNDRED: "51-200",
  TWO_HUNDRED_ONE_TO_ONE_THOUSAND: "201-1,000",
  ONE_THOUSAND_PLUS: "1,000+",
};

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ error?: string }>;

  return axiosError.response?.data?.error ?? "Something went wrong";
}

function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function requesterName(request: PlatformAccessRequest) {
  return `${request.contactFirstName} ${request.contactLastName}`;
}

const STATUS_BADGE_STYLES: Record<PlatformAccessRequestStatus, string> = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  DECLINED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const STATUS_DOT_STYLES: Record<PlatformAccessRequestStatus, string> = {
  PENDING: "bg-amber-500",
  APPROVED: "bg-emerald-500",
  DECLINED: "bg-red-500",
};

function getStats(requests: PlatformAccessRequest[]) {
  return {
    total: requests.length,
    pending: requests.filter((request) => request.status === "PENDING").length,
    approved: requests.filter((request) => request.status === "APPROVED")
      .length,
    declined: requests.filter((request) => request.status === "DECLINED")
      .length,
  };
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value || "Not provided"}</dd>
    </div>
  );
}

export function PlatformAccessRequests() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlatformAccessRequestStatus | "ALL">(
    "ALL",
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );

  const [approvalForm, setApprovalForm] = useState({
    name: "",
    slug: "",
  });
  const [declineReason, setDeclineReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

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
    usePlatformAccessRequests(queryParams);
  const selectedRequest = usePlatformAccessRequest(selectedRequestId);

  const { platformUser } = usePlatformAuth();
  const approveRequest = useApprovePlatformAccessRequest();
  const declineRequest = useDeclinePlatformAccessRequest();

  const selectedAccessRequest = selectedRequest.data;
  const canReviewRequests = platformUser?.role === "SUPER_ADMIN";
  const isReviewPending = approveRequest.isPending || declineRequest.isPending;

  const requests = data?.data ?? [];
  const pagination = data?.meta.pagination;
  const stats = getStats(requests);

  useEffect(() => {
    if (!selectedAccessRequest) return;

    setApprovalForm({
      name: selectedAccessRequest.organizationName,
      slug: slugFromName(selectedAccessRequest.organizationName),
    });
    setDeclineReason(selectedAccessRequest.declineReason ?? "");
    setReviewError(null);
  }, [
    selectedAccessRequest?.id,
    selectedAccessRequest?.organizationName,
    selectedAccessRequest?.declineReason,
  ]);

  function handleApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAccessRequest) return;

    setReviewError(null);

    approveRequest.mutate(
      {
        requestId: selectedAccessRequest.id,
        payload: approvalForm,
      },
      {
        onError: (error) => setReviewError(errorMessage(error)),
      },
    );
  }

  function handleDecline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAccessRequest) return;

    setReviewError(null);

    declineRequest.mutate(
      {
        requestId: selectedAccessRequest.id,
        payload: {
          declineReason: declineReason.trim() || undefined,
        },
      },
      {
        onError: (error) => setReviewError(errorMessage(error)),
      },
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            <span>Platform Console</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Access Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review public organization access requests before any tenant is
            created.
          </p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visible</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock3 className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Linked to tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
            <XCircle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.declined}</div>
            <p className="text-xs text-muted-foreground">Not approved</p>
          </CardContent>
        </Card>
      </section>

      <section className="overflow-x-auto rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requester, email, or organization"
              className="pl-9"
            />
          </div>

          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as PlatformAccessRequestStatus | "ALL")
            }
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Status">
                {(value) =>
                  value === "ALL"
                    ? "All statuses"
                    : STATUS_LABELS[value as PlatformAccessRequestStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "ALL" ? "All statuses" : STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium">
              Unable to load access requests
            </p>
            <p className="text-sm text-muted-foreground">
              The platform request queue could not be loaded.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No access requests found</p>
            <p className="text-sm text-muted-foreground">
              Adjust the filters or wait for new public submissions.
            </p>
          </div>
        ) : (
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Company Size</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Resulting Organization</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium">{requesterName(request)}</div>
                    <div className="text-xs text-muted-foreground">
                      {request.contactEmail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {request.organizationName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {request.country || "Country not provided"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-full",
                        STATUS_BADGE_STYLES[request.status],
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          STATUS_DOT_STYLES[request.status],
                        )}
                        aria-hidden
                      />
                      {STATUS_LABELS[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.companySize
                      ? COMPANY_SIZE_LABELS[request.companySize]
                      : "Not provided"}
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    {request.organization ? (
                      <div>
                        <div className="text-sm font-medium">
                          {request.organization.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {request.organization.slug}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not created
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedRequestId(request.id)}
                      >
                        <Eye className="size-4" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Sheet
        open={!!selectedRequestId}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Access Request Details</SheetTitle>
            <SheetDescription>
              Review the submitted organization and requester information.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6">
            {selectedRequest.isLoading ? (
              <div className="flex min-h-40 items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : selectedRequest.isError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Unable to load this access request.
              </div>
            ) : selectedRequest.data ? (
              <dl className="grid gap-3">
                <DetailRow
                  label="Requester"
                  value={requesterName(selectedRequest.data)}
                />
                <DetailRow
                  label="Email"
                  value={selectedRequest.data.contactEmail}
                />
                <DetailRow
                  label="Organization"
                  value={selectedRequest.data.organizationName}
                />
                <DetailRow
                  label="Website"
                  value={selectedRequest.data.websiteUrl}
                />
                <DetailRow
                  label="Country"
                  value={selectedRequest.data.country}
                />
                <DetailRow
                  label="Company Size"
                  value={
                    selectedRequest.data.companySize
                      ? COMPANY_SIZE_LABELS[selectedRequest.data.companySize]
                      : null
                  }
                />
                <DetailRow
                  label="Intended Use"
                  value={selectedRequest.data.intendedUse}
                />
                <DetailRow label="Notes" value={selectedRequest.data.notes} />
                <DetailRow
                  label="Status"
                  value={STATUS_LABELS[selectedRequest.data.status]}
                />
                <DetailRow
                  label="Reviewed By"
                  value={selectedRequest.data.reviewedByPlatformUser?.fullName}
                />
                <DetailRow
                  label="Reviewed At"
                  value={formatDate(selectedRequest.data.reviewedAt)}
                />
                <DetailRow
                  label="Decline Reason"
                  value={selectedRequest.data.declineReason}
                />
                <DetailRow
                  label="Resulting Organization"
                  value={selectedRequest.data.organization?.name}
                />

                {selectedAccessRequest?.status === "PENDING" && (
                  <div className="grid gap-4 rounded-md border bg-muted/20 p-4">
                    {!canReviewRequests && (
                      <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                        Your platform role has read-only access to this request.
                      </div>
                    )}

                    {reviewError && (
                      <div
                        role="alert"
                        className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      >
                        {reviewError}
                      </div>
                    )}

                    <form className="grid gap-3" onSubmit={handleApprove}>
                      <div className="grid gap-2">
                        <Label htmlFor="approval-name">Organization name</Label>
                        <Input
                          id="approval-name"
                          value={approvalForm.name}
                          onChange={(event) =>
                            setApprovalForm((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          disabled={!canReviewRequests || isReviewPending}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="approval-slug">Slug</Label>
                        <Input
                          id="approval-slug"
                          value={approvalForm.slug}
                          onChange={(event) =>
                            setApprovalForm((current) => ({
                              ...current,
                              slug: event.target.value,
                            }))
                          }
                          disabled={!canReviewRequests || isReviewPending}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="gap-2"
                        disabled={!canReviewRequests || isReviewPending}
                      >
                        {approveRequest.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        Approve and Create Organization
                      </Button>
                    </form>

                    <form className="grid gap-3" onSubmit={handleDecline}>
                      <div className="grid gap-2">
                        <Label htmlFor="decline-reason">Decline reason</Label>
                        <Textarea
                          id="decline-reason"
                          value={declineReason}
                          onChange={(event) =>
                            setDeclineReason(event.target.value)
                          }
                          disabled={!canReviewRequests || isReviewPending}
                          rows={3}
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="destructive"
                        className="gap-2"
                        disabled={!canReviewRequests || isReviewPending}
                      >
                        {declineRequest.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                        Decline Request
                      </Button>
                    </form>
                  </div>
                )}

                {selectedRequest.data.organization && (
                  <div className="rounded-md border bg-muted/20 p-3">
                    <dt className="text-xs font-medium text-muted-foreground">
                      Organization Link
                    </dt>
                    <dd className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a href="/platform/organizations">
                            <Building2 className="mr-2 size-4" />
                            Open Organizations
                          </a>
                        }
                      />
                    </dd>
                  </div>
                )}
              </dl>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
