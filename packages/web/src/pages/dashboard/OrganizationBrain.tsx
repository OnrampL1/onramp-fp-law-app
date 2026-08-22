import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateOrganizationBrainPaste,
  useCreateOrganizationBrainUpload,
  useDeleteOrganizationBrainItem,
  useOrganizationBrainItems,
} from "@/hooks/useOrganizationBrain";
import { isAdminRole } from "@/lib/permissions";
import type { OrganizationBrainItem } from "@/types/organization-brain";
import {
  organizationBrainItemSourceLabels,
  organizationBrainItemTypeLabels,
  type OrganizationBrainItemType,
} from "@/types/organization-brain";

type TypeFilter = "all" | OrganizationBrainItemType;
type CreateMode = "upload" | "paste";

const itemTypes: OrganizationBrainItemType[] = [
  "TEMPLATE",
  "POLICY",
  "CLAUSE",
  "GUIDELINE",
];

const pageSize = 20;

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = error.response.data as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  }

  return fallback;
}

export function OrganizationBrain() {
  const { user } = useAuth();
  const canManageBrain = isAdminRole(user?.role);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [createMode, setCreateMode] = useState<CreateMode>("upload");
  const [title, setTitle] = useState("");
  const [itemType, setItemType] =
    useState<OrganizationBrainItemType>("TEMPLATE");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<OrganizationBrainItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const listParams = useMemo(
    () => ({
      page,
      pageSize,
      search: search.trim() || undefined,
      type: typeFilter === "all" ? undefined : typeFilter,
    }),
    [page, search, typeFilter],
  );

  const itemsQuery = useOrganizationBrainItems(listParams);
  const uploadMutation = useCreateOrganizationBrainUpload();
  const pasteMutation = useCreateOrganizationBrainPaste();
  const deleteMutation = useDeleteOrganizationBrainItem();

  const items = itemsQuery.data?.items ?? [];
  const pagination = itemsQuery.data?.pagination;

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  // Same-origin streaming route, not a presigned MinIO URL — MinIO has no
  // public hostname (by design), so a presigned URL handed straight to the
  // browser would DNS-fail in production.
  function handleDownload(itemId: string) {
    window.location.assign(`/api/organization-brain/${itemId}/file`);
  }

  function resetCreateForm() {
    setTitle("");
    setItemType("TEMPLATE");
    setFile(null);
    setContent("");
  }

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageBrain) return;

    if (createMode === "upload") {
      if (!file) return;

      uploadMutation.mutate(
        {
          title: title.trim(),
          type: itemType,
          file,
        },
        { onSuccess: resetCreateForm },
      );
      return;
    }

    pasteMutation.mutate(
      {
        title: title.trim(),
        type: itemType,
        content,
      },
      { onSuccess: resetCreateForm },
    );
  }

  function handleConfirmDelete() {
    if (!deleteTarget || !canManageBrain) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const createError =
    createMode === "upload" ? uploadMutation.error : pasteMutation.error;

  const isCreating =
    createMode === "upload"
      ? uploadMutation.isPending
      : pasteMutation.isPending;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuit className="size-5" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Organization Brain
            </h1>
            <p className="text-sm text-muted-foreground">
              Store approved templates, policies, clauses, and internal
              guidelines for your organization.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => itemsQuery.refetch()}
          disabled={itemsQuery.isFetching}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {!canManageBrain && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </div>

          <div>
            <p className="text-sm font-medium">Read-only access</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can review and download organization brain items, but only
              owners and administrators can add or delete them.
            </p>
          </div>
        </div>
      )}

      {canManageBrain && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Add organization brain item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateSubmit}>
              <Tabs
                value={createMode}
                onValueChange={(value) => setCreateMode(value as CreateMode)}
              >
                <TabsList className="h-9 w-fit">
                  <TabsTrigger
                    value="upload"
                    className="gap-2 data-[active]:bg-primary data-[active]:font-semibold data-[active]:text-primary-foreground data-[active]:shadow-sm dark:data-[active]:bg-primary dark:data-[active]:text-primary-foreground"
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    Upload file
                  </TabsTrigger>
                  <TabsTrigger
                    value="paste"
                    className="gap-2 data-[active]:bg-primary data-[active]:font-semibold data-[active]:text-primary-foreground data-[active]:shadow-sm dark:data-[active]:bg-primary dark:data-[active]:text-primary-foreground"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Paste text
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <Label htmlFor="organization-brain-title">Title</Label>
                  <Input
                    id="organization-brain-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={500}
                    required
                    placeholder="Preferred SaaS MSA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization-brain-type">Type</Label>
                  <Select
                    value={itemType}
                    onValueChange={(value) =>
                      setItemType(value as OrganizationBrainItemType)
                    }
                  >
                    <SelectTrigger id="organization-brain-type">
                      <SelectValue>
                        {(value) =>
                          organizationBrainItemTypeLabels[
                            value as OrganizationBrainItemType
                          ]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {organizationBrainItemTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {createMode === "upload" ? (
                <div className="space-y-2">
                  <Label htmlFor="organization-brain-file">File</Label>
                  <input
                    ref={fileInputRef}
                    id="organization-brain-file"
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    required
                    className="sr-only"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-4" aria-hidden="true" />
                      Choose file
                    </Button>
                    <span className="truncate text-sm text-muted-foreground">
                      {file ? file.name : "No file chosen"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, DOCX, and TXT. Maximum size: 10 MB.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="organization-brain-content">Content</Label>
                  <Textarea
                    id="organization-brain-content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    required
                    rows={8}
                    maxLength={500000}
                    placeholder="Paste approved clause language or internal guidance here."
                  />
                </div>
              )}

              {createError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {getErrorMessage(
                    createError,
                    "Couldn't add organization brain item.",
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <LoadingSpinner />
                  ) : createMode === "upload" ? (
                    <Upload className="size-4" aria-hidden="true" />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                  Add item
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Search organization brain"
              aria-label="Search organization brain"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-52"
              aria-label="Filter organization brain items by type"
            >
              <SelectValue>
                {(value) =>
                  value === "all"
                    ? "All Types"
                    : organizationBrainItemTypeLabels[
                        value as OrganizationBrainItemType
                      ]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {itemTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {organizationBrainItemTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {itemsQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : itemsQuery.isError ? (
          <div className="p-4 text-sm text-destructive">
            Couldn't load organization brain items. Try refreshing the page.
          </div>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Added</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <FileText className="size-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.fileName ?? "Stored text item"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {organizationBrainItemTypeLabels[item.type]}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {organizationBrainItemSourceLabels[item.source]}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatBytes(item.sizeBytes)}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{formatDate(item.createdAt)}</div>
                        <div className="text-xs">by {item.createdByName}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleDownload(item.id)}
                          >
                            <Download className="size-4" aria-hidden="true" />
                            Download
                          </Button>

                          {canManageBrain && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-14 text-center text-muted-foreground"
                      >
                        <p className="font-medium text-foreground">
                          No organization brain items found
                        </p>
                        <p className="mt-1 text-sm">
                          Add templates, policies, clauses, or guidelines to
                          make them available to your organization.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1),
                )
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization brain item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteTarget?.title}" from the organization brain.
              The action is audited and cannot be undone from this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteMutation.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {getErrorMessage(
                deleteMutation.error,
                "Couldn't delete organization brain item.",
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
