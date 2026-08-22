import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AxiosError } from "axios";
import {
  Building2,
  CheckCircle2,
  CircleSlash,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { PlatformPagination } from "../../components/platform/PlatformPagination";
import { cn } from "../../lib/utils";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePlatformAuth } from "../../hooks/usePlatformAuth";
import {
  useAssignPlatformOrganizationOwner,
  useCreatePlatformOrganization,
  usePlatformOrganizations,
  useUpdatePlatformOrganizationStatus,
} from "../../hooks/usePlatformOrganizations";
import type {
  PlatformOrganizationListItem,
  PlatformOrganizationStatus,
  UpdatePlatformOrganizationStatusPayload,
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
  ARCHIVED: "Deleted",
};

const STATUS_ACTION_LABELS: Record<
  UpdatePlatformOrganizationStatusPayload["status"],
  string
> = {
  ACTIVE: "Activate",
  SUSPENDED: "Suspend",
  ARCHIVED: "Delete",
};

const STATUS_BADGE_STYLES: Record<PlatformOrganizationStatus, string> = {
  CREATED:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300",
  OWNER_ASSIGNED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  SUSPENDED:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
  ARCHIVED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const STATUS_DOT_STYLES: Record<PlatformOrganizationStatus, string> = {
  CREATED: "bg-slate-500",
  OWNER_ASSIGNED: "bg-amber-500",
  ACTIVE: "bg-emerald-500",
  SUSPENDED: "bg-orange-500",
  ARCHIVED: "bg-red-500",
};

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

function nextStatusActions(
  organization: PlatformOrganizationListItem,
): UpdatePlatformOrganizationStatusPayload["status"][] {
  if (organization.status === "OWNER_ASSIGNED") return ["ARCHIVED"];
  if (organization.status === "ACTIVE") return ["SUSPENDED", "ARCHIVED"];
  if (organization.status === "SUSPENDED") return ["ACTIVE", "ARCHIVED"];
  if (organization.status === "CREATED") return ["ARCHIVED"];
  return [];
}

function statusDialogTitle(
  status: UpdatePlatformOrganizationStatusPayload["status"],
) {
  if (status === "ACTIVE") return "Activate organization?";
  if (status === "SUSPENDED") return "Suspend organization?";
  return "Delete organization?";
}

function statusDialogDescription(
  statusTarget: {
    organization: PlatformOrganizationListItem;
    status: UpdatePlatformOrganizationStatusPayload["status"];
  } | null,
) {
  if (!statusTarget) return "This will update the organization status.";

  if (statusTarget.status === "ACTIVE") {
    return `${statusTarget.organization.name} will regain access to the application for active members.`;
  }

  if (statusTarget.status === "SUSPENDED") {
    return `${statusTarget.organization.name} will be temporarily blocked from the application. Members will not be able to access the workspace until it is reactivated.`;
  }

  return `${statusTarget.organization.name} will be permanently deleted and can never be reactivated. Type the organization name below to confirm.`;
}

function statusDialogActionLabel(
  status: UpdatePlatformOrganizationStatusPayload["status"],
) {
  if (status === "ACTIVE") return "Activate organization";
  if (status === "SUSPENDED") return "Suspend organization";
  return "Delete organization";
}

interface CreateOrganizationForm {
  name: string;
  slug: string;
}

interface AssignOwnerForm {
  email: string;
  fullName: string;
  password: string;
}

export function PlatformOrganizations() {
  const { platformUser } = usePlatformAuth();
  const canManageOrganizations = platformUser?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlatformOrganizationStatus | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [ownerTarget, setOwnerTarget] =
    useState<PlatformOrganizationListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    organization: PlatformOrganizationListItem;
    status: UpdatePlatformOrganizationStatusPayload["status"];
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  const [createForm, setCreateForm] = useState<CreateOrganizationForm>({
    name: "",
    slug: "",
  });

  const [ownerForm, setOwnerForm] = useState<AssignOwnerForm>({
    email: "",
    fullName: "",
    password: "",
  });

  useEffect(() => {
    if (!feedback) return;

    const timeout = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const queryParams = useMemo(
    () => ({
      page,
      limit: 50,
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(status !== "ALL" && { status }),
    }),
    [page, debouncedSearch, status],
  );

  const { data, isLoading, isError, refetch } =
    usePlatformOrganizations(queryParams);

  const createOrganization = useCreatePlatformOrganization();
  const assignOwner = useAssignPlatformOrganizationOwner();
  const updateStatus = useUpdatePlatformOrganizationStatus();

  const organizations = data?.data ?? [];
  const pagination = data?.meta.pagination;
  const stats = getStats(organizations);

  function resetCreateForm() {
    setCreateForm({
      name: "",
      slug: "",
    });
  }

  function resetOwnerForm() {
    setOwnerForm({
      email: "",
      fullName: "",
      password: "",
    });
    setShowOwnerPassword(false);
  }

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    try {
      await createOrganization.mutateAsync(createForm);
      setFeedback({ type: "success", message: "Organization created." });
      setCreateOpen(false);
      resetCreateForm();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function handleAssignOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ownerTarget) return;

    setFormError(null);
    setFeedback(null);

    try {
      await assignOwner.mutateAsync({
        organizationId: ownerTarget.id,
        payload: ownerForm,
      });
      setFeedback({ type: "success", message: "First owner assigned." });
      setOwnerTarget(null);
      resetOwnerForm();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function handleStatusChange() {
    if (!statusTarget) return;

    setFeedback(null);

    try {
      await updateStatus.mutateAsync({
        organizationId: statusTarget.organization.id,
        payload: { status: statusTarget.status },
      });
      setFeedback({
        type: "success",
        message: `${statusTarget.organization.name} updated to ${
          STATUS_LABELS[statusTarget.status]
        }.`,
      });
      setStatusTarget(null);
      setDeleteConfirmText("");
    } catch (error) {
      setFeedback({ type: "error", message: errorMessage(error) });
      setStatusTarget(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
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

        <Button
          className="gap-2"
          disabled={!canManageOrganizations}
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4" />
          New Organization
        </Button>
      </header>

      {!canManageOrganizations && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Your platform role has read-only access to this organization
          directory.
        </div>
      )}

      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <CircleSlash className="size-4 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setFeedback(null)}
            className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

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
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Open workspaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Owner</CardTitle>
            <Clock3 className="size-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.needsOwner}</div>
            <p className="text-xs text-muted-foreground">Created only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <CircleSlash className="size-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.suspended}</div>
            <p className="text-xs text-muted-foreground">Access blocked</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
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
              <SelectValue placeholder="Status">
                {(value) =>
                  value === "ALL"
                    ? "All statuses"
                    : STATUS_LABELS[value as PlatformOrganizationStatus]
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
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Contracts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-64 text-right">Actions</TableHead>
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
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-full",
                        STATUS_BADGE_STYLES[organization.status],
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          STATUS_DOT_STYLES[organization.status],
                        )}
                        aria-hidden
                      />
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
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5 text-muted-foreground" />
                      {organization.counts.members}
                    </span>
                  </TableCell>
                  <TableCell>{organization.counts.contracts}</TableCell>
                  <TableCell>{formatDate(organization.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!organization.owner && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={!canManageOrganizations}
                          onClick={() => {
                            setFormError(null);
                            setOwnerTarget(organization);
                          }}
                        >
                          <UserPlus className="size-4" />
                          Owner
                        </Button>
                      )}

                      {nextStatusActions(organization).map((targetStatus) => (
                        <Button
                          key={targetStatus}
                          variant={
                            targetStatus === "ARCHIVED"
                              ? "destructive"
                              : "outline"
                          }
                          size="sm"
                          disabled={!canManageOrganizations}
                          onClick={() =>
                            setStatusTarget({
                              organization,
                              status: targetStatus,
                            })
                          }
                        >
                          {targetStatus === "ARCHIVED" && (
                            <Trash2 className="mr-2 size-4" />
                          )}
                          {targetStatus === "ACTIVE" && (
                            <CheckCircle2 className="mr-2 size-4" />
                          )}
                          {targetStatus === "SUSPENDED" && (
                            <CircleSlash className="mr-2 size-4" />
                          )}
                          {STATUS_ACTION_LABELS[targetStatus]}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {pagination && pagination.total > 0 && (
          <PlatformPagination pagination={pagination} onPageChange={setPage} />
        )}
      </section>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Organization</SheetTitle>
            <SheetDescription>
              New organizations start in Created status until an Owner is
              assigned.
            </SheetDescription>
          </SheetHeader>

          <form
            className="flex flex-1 flex-col"
            onSubmit={handleCreateOrganization}
          >
            <div className="flex flex-col gap-4 px-4">
              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="organization-name">Name</Label>
                <Input
                  id="organization-name"
                  value={createForm.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setCreateForm((current) => ({
                      ...current,
                      name,
                      slug: current.slug || slugFromName(name),
                    }));
                  }}
                  placeholder="Acme Legal Ops"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="organization-slug">Slug</Label>
                <Input
                  id="organization-slug"
                  value={createForm.slug}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      slug: slugFromName(event.target.value),
                    }))
                  }
                  placeholder="acme-legal-ops"
                  required
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createOrganization.isPending}>
                {createOrganization.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!ownerTarget}
        onOpenChange={(open) => {
          if (!open) {
            setOwnerTarget(null);
            resetOwnerForm();
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assign First Owner</SheetTitle>
            <SheetDescription>
              {ownerTarget
                ? `Create the first Owner account for ${ownerTarget.name}.`
                : "Create the first Owner account."}
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-1 flex-col" onSubmit={handleAssignOwner}>
            <div className="flex flex-col gap-4 px-4">
              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="owner-email">Owner Email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={ownerForm.email}
                  onChange={(event) =>
                    setOwnerForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="owner@company.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="owner-full-name">Full Name</Label>
                <Input
                  id="owner-full-name"
                  value={ownerForm.fullName}
                  onChange={(event) =>
                    setOwnerForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="Alex Morgan"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="owner-password">Temporary Password</Label>
                <div className="relative">
                  <Input
                    id="owner-password"
                    type={showOwnerPassword ? "text" : "password"}
                    value={ownerForm.password}
                    onChange={(event) =>
                      setOwnerForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Minimum 8 characters"
                    className="pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword((value) => !value)}
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={
                      showOwnerPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showOwnerPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOwnerTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assignOwner.isPending}>
                {assignOwner.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Assigning
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 size-4" />
                    Assign Owner
                  </>
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open && !updateStatus.isPending) {
            setStatusTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget
                ? statusDialogTitle(statusTarget.status)
                : "Update organization"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialogDescription(statusTarget)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {statusTarget?.status === "ARCHIVED" && (
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-name">
                Type{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                  {statusTarget.organization.name}
                </code>{" "}
                to confirm
              </Label>
              <Input
                id="delete-confirm-name"
                value={deleteConfirmText}
                onChange={(event) =>
                  setDeleteConfirmText(event.target.value)
                }
                placeholder="Organization name"
                autoComplete="off"
                disabled={updateStatus.isPending}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant={
                statusTarget?.status === "ARCHIVED" ||
                statusTarget?.status === "SUSPENDED"
                  ? "destructive"
                  : "default"
              }
              disabled={
                updateStatus.isPending ||
                (statusTarget?.status === "ARCHIVED" &&
                  deleteConfirmText !== statusTarget.organization.name)
              }
              onClick={(event) => {
                event.preventDefault();
                void handleStatusChange();
              }}
            >
              {updateStatus.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Updating
                </>
              ) : statusTarget ? (
                statusDialogActionLabel(statusTarget.status)
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
