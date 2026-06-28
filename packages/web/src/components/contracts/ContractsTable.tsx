"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { allContracts, contractTags } from "@/lib/data";
import type { Contract, ContractStatus, RiskLevel } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Sparkles,
  Link2,
  Archive,
  FileText,
  FileSearch,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Link } from "react-router-dom";
import { RiskBadge, StatusBadge } from "./badges";

type SortKey =
  | "name"
  | "counterparty"
  | "status"
  | "risk"
  | "effective"
  | "expiration"
  | "updated";
type SortDir = "asc" | "desc";

const riskOrder: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
};
const statusOrder: Record<ContractStatus, number> = {
  Draft: 0,
  Active: 1,
  Expired: 2,
  Terminated: 3,
};

const PAGE_SIZE = 8;

function parseDate(value?: string) {
  if (!value || value === "—") return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// Approximate "updated" recency for sorting
const updatedRank: Record<string, number> = {};
function rankUpdated(value: string) {
  if (value in updatedRank) return updatedRank[value];
  const lower = value.toLowerCase();
  let score = 0;
  const num = Number.parseInt(lower, 10) || 1;
  if (lower.includes("hour") || lower.includes("min")) score = 1;
  else if (lower.includes("yesterday")) score = 24;
  else if (lower.includes("day")) score = num * 24;
  else if (lower.includes("week")) score = num * 24 * 7;
  else if (lower.includes("month")) score = num * 24 * 30;
  updatedRank[value] = score;
  return score;
}

export function ContractsTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const [tag, setTag] = useState("all");
  const [expiration, setExpiration] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const filtersActive =
    query !== "" ||
    status !== "all" ||
    risk !== "all" ||
    tag !== "all" ||
    expiration !== "all";

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setRisk("all");
    setTag("all");
    setExpiration("all");
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const now = Date.now();
    const result = allContracts.filter((c) => {
      if (query) {
        const q = query.toLowerCase();
        const hay =
          `${c.name} ${c.counterparty} ${c.id} ${c.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== "all" && c.status !== status) return false;
      if (risk !== "all" && c.risk !== risk) return false;
      if (tag !== "all" && !(c.tags ?? []).includes(tag)) return false;
      if (expiration !== "all") {
        const exp = parseDate(c.expiration);
        if (expiration === "none" && exp !== 0) return false;
        if (expiration !== "none") {
          if (exp === 0) return false;
          const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
          if (expiration === "expired" && days >= 0) return false;
          if (expiration === "30" && (days < 0 || days > 30)) return false;
          if (expiration === "90" && (days < 0 || days > 90)) return false;
        }
      }
      return true;
    });

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
        case "counterparty":
          cmp = a[sortKey].localeCompare(b[sortKey]);
          break;
        case "status":
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "risk":
          cmp = riskOrder[a.risk] - riskOrder[b.risk];
          break;
        case "effective":
        case "expiration":
          cmp = parseDate(a[sortKey]) - parseDate(b[sortKey]);
          break;
        case "updated":
          cmp = rankUpdated(a.updated) - rankUpdated(b.updated);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [query, status, risk, tag, expiration, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <Card className="overflow-hidden p-0">
      {/* Filters */}
      <div className="border-b border-border p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search contracts or parties..."
              className="pl-9"
              aria-label="Search contracts"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              placeholder="Status"
              options={[
                { value: "all", label: "All statuses" },
                { value: "Draft", label: "Draft" },
                { value: "Active", label: "Active" },
                { value: "Expired", label: "Expired" },
                { value: "Terminated", label: "Terminated" },
              ]}
            />
            <FilterSelect
              value={risk}
              onChange={(v) => {
                setRisk(v);
                setPage(1);
              }}
              placeholder="Risk"
              options={[
                { value: "all", label: "All risk levels" },
                { value: "Low", label: "Low" },
                { value: "Medium", label: "Medium" },
                { value: "High", label: "High" },
                { value: "Critical", label: "Critical" },
              ]}
            />
            <FilterSelect
              value={tag}
              onChange={(v) => {
                setTag(v);
                setPage(1);
              }}
              placeholder="Tags"
              options={[
                { value: "all", label: "All tags" },
                ...contractTags.map((t) => ({ value: t, label: t })),
              ]}
            />
            <FilterSelect
              value={expiration}
              onChange={(v) => {
                setExpiration(v);
                setPage(1);
              }}
              placeholder="Expiration"
              options={[
                { value: "all", label: "Any expiration" },
                { value: "30", label: "Next 30 days" },
                { value: "90", label: "Next 90 days" },
                { value: "expired", label: "Already expired" },
                { value: "none", label: "No expiration" },
              ]}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={!filtersActive}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead
                label="Contract Name"
                sortKey="name"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHead
                label="Counterparty"
                sortKey="counterparty"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHead
                label="Status"
                sortKey="status"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHead
                label="Risk Level"
                sortKey="risk"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHead
                label="Effective Date"
                sortKey="effective"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHead
                label="Expiration Date"
                sortKey="expiration"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHead
                label="Last Updated"
                sortKey="updated"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8}>
                  <EmptyState
                    onReset={resetFilters}
                    hasFilters={filtersActive}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paged.map((c) => <ContractRow key={c.id} contract={c} />)
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {filtered.length}
            </span>{" "}
            contracts
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="icon"
                className="size-9"
                onClick={() => setPage(i + 1)}
                aria-current={currentPage === i + 1 ? "page" : undefined}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className="min-w-[8.5rem]"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder}>
          {(val) => options.find((o) => o.value === val)?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortableHead({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const isActive = active === sortKey;
  return (
    <TableHead>
      <button
        onClick={() => onClick(sortKey)}
        className={cn(
          "flex items-center gap-1.5 text-left font-medium transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

function ContractRow({ contract: c }: { contract: Contract }) {
  return (
    <TableRow className="group">
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
              {c.value !== "—" ? ` · ${c.value}` : ""}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{c.counterparty}</TableCell>
      <TableCell>
        <StatusBadge status={c.status} />
      </TableCell>
      <TableCell>
        <RiskBadge risk={c.risk} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {c.effective ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{c.expiration}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {c.updated}
      </TableCell>
      <TableCell className="text-right">
        <RowActions id={c.id} />
      </TableCell>
    </TableRow>
  );
}

function RowActions({ id }: { id: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label="Contract actions"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem render={<Link to={`/contracts/${id}`} />}>
          <Eye className="size-4" />
          View Contract
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil className="size-4" />
          Edit Metadata
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Sparkles className="size-4" />
          View AI Analysis
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link2 className="size-4" />
          Generate Witness Link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Archive className="size-4" />
          Archive Contract
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({
  onReset,
  hasFilters,
}: {
  onReset: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <FileSearch className="size-6" />
      </div>
      <div>
        <p className="font-medium text-foreground">No contracts found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Upload your first contract to get started."}
        </p>
      </div>
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-1.5"
        >
          <RotateCcw className="size-4" />
          Reset filters
        </Button>
      )}
    </div>
  );
}
