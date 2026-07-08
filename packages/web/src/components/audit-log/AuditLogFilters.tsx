import { Input } from "../../components/ui/input";
import type { AuditVerb } from "../../lib/data";

// ─── Filter state shape (owned by AuditLogPage) ───────────────────────────────

export interface AuditLogFilterState {
  search:   string;
  user:     string;
  action:   string;
  contract: string;
  time:     string;
  severity: string;
}

interface AuditLogFiltersProps {
  filters:   AuditLogFilterState;
  onChange:  (next: Partial<AuditLogFilterState>) => void;
  onRefresh?: () => void;
}

// ─── Dropdown options ─────────────────────────────────────────────────────────

const USER_OPTIONS     = ["All users",     "Sophie Bauer", "Amelia Hartwell", "Diego Ramirez", "Marcus Lee", "Grace Okoro"];
const ACTION_OPTIONS   = ["All actions",   "Update", "Create", "Delete", "Auth", "View", "Export", "Permission"];
const CONTRACT_OPTIONS = ["All contracts", "Contoso MSA 2026", "Contoso Renewal SOW", "Globex NDA", "Umbrella Services Agreement"];
const TIME_OPTIONS     = ["All time",      "Today", "Last 7 days", "Last 30 days", "Last 90 days"];
const SEVERITY_OPTIONS = ["All severities","Create", "Update", "Delete", "Auth", "View", "Export"];

const selectClass =
  "h-9 rounded-full border border-border bg-background px-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer";


export function AuditLogFilters({ filters, onChange, onRefresh }: AuditLogFiltersProps) {
  const hasActiveFilters =
    filters.search !== "" ||
    filters.user !== "All users" ||
    filters.action !== "All actions" ||
    filters.contract !== "All contracts" ||
    filters.time !== "All time" ||
    filters.severity !== "All severities";

  return (
    <div className="flex flex-col gap-3">

      {/* Search */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
        </svg>
        <Input
          placeholder="Search action, resource, user, or IP"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Dropdowns row */}
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={filters.user}
          options={USER_OPTIONS}
          onChange={(v) => onChange({ user: v })}
        />
        <FilterSelect
          value={filters.action}
          options={ACTION_OPTIONS}
          onChange={(v) => onChange({ action: v })}
        />
        <FilterSelect
          value={filters.contract}
          options={CONTRACT_OPTIONS}
          onChange={(v) => onChange({ contract: v })}
        />
        <FilterSelect
          value={filters.time}
          options={TIME_OPTIONS}
          onChange={(v) => onChange({ time: v })}
        />
        <FilterSelect
          value={filters.severity}
          options={SEVERITY_OPTIONS}
          onChange={(v) => onChange({ severity: v })}
        />

        <button
          type="button"
          onClick={() => onRefresh?.()}
          disabled={!hasActiveFilters}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
}

// ─── Reusable select ──────────────────────────────────────────────────────────

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {/* Custom chevron */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}