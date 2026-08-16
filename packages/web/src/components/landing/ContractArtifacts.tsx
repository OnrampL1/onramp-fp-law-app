import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  ShieldAlert,
  CalendarClock,
  Scale,
  CircleDot,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** Status pill -- reserved for statuses/identity, mirroring the app's badge language. */
export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "risk" | "signal";
}) {
  const tones = {
    neutral: "text-muted-foreground border-border",
    ok: "text-ok border-ok/30",
    risk: "text-risk border-risk/30",
    signal: "text-signal border-signal/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase",
        tones[tone],
      )}
    >
      <CircleDot className="size-2.5" strokeWidth={2.5} />
      {children}
    </span>
  );
}

/** Icon-in-chip pattern, matching the app's existing convention. */
export function IconChip({
  icon: Icon,
  size = "md",
}: {
  icon: LucideIcon;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-muted-foreground",
        size === "sm" ? "size-6" : "size-8",
      )}
    >
      <Icon
        className={size === "sm" ? "size-3" : "size-4"}
        strokeWidth={1.75}
      />
    </span>
  );
}

/** A scattered artifact of the old contract workflow -- a raw, unstructured document. */
export function Sheet({
  lines = 6,
  width = 168,
  kind = "page",
}: {
  lines?: number;
  width?: number;
  kind?: "page" | "sheet" | "mail" | "folder";
}) {
  return (
    <div
      className="rounded-[6px] border border-black/10 bg-paper p-3 text-paper-foreground shadow-[0_18px_40px_-24px_oklch(0_0_0/0.9)]"
      style={{ width }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="h-1.5 w-10 rounded-full bg-paper-foreground/50" />
        <div className="font-mono text-[8px] tracking-[0.16em] text-paper-foreground/45 uppercase">
          {kind === "mail" ? "RE: FWD" : kind === "folder" ? "ARCHIVE" : "PDF"}
        </div>
      </div>
      {kind === "sheet" ? (
        <div className="grid grid-cols-3 gap-px bg-paper-foreground/15">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-3 bg-paper" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full bg-paper-foreground/25"
              style={{ width: `${55 + ((i * 37) % 45)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ContractCard({
  title,
  counterparty,
  status = "Active",
  tone = "ok",
  className,
}: {
  title: string;
  counterparty: string;
  status?: string;
  tone?: "ok" | "risk" | "signal" | "neutral";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[248px] rounded-[10px] border border-border bg-surface/95 p-3.5 backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <IconChip icon={FileText} />
        <div className="min-w-0 flex-1">
          <p className="label-mono">Contract</p>
          <p className="mt-1 truncate text-[13px] font-medium text-foreground">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {counterparty}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <StatusPill tone={tone}>{status}</StatusPill>
        <span className="font-mono text-[11px] text-muted-foreground">
          v4 · 24 clauses
        </span>
      </div>
    </div>
  );
}

export function ClauseCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[236px] rounded-[10px] border border-border bg-surface/95 p-3.5 backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <IconChip icon={Scale} size="sm" />
        <p className="label-mono">Clause 8.2 · Liability</p>
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
        Aggregate liability capped at{" "}
        <span className="text-foreground">120% of fees paid</span> in the
        preceding 12 months.
      </p>
      <div className="mt-3 flex gap-1.5">
        <StatusPill tone="signal">Extracted</StatusPill>
      </div>
    </div>
  );
}

export function ObligationCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[228px] rounded-[10px] border border-border bg-surface/95 p-3.5 backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <IconChip icon={CalendarClock} size="sm" />
        <p className="label-mono">Obligation</p>
      </div>
      <p className="mt-2.5 text-[12px] text-foreground">
        Renewal notice window opens
      </p>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">
          2026-09-14
        </span>
        <StatusPill tone="risk">T-30d</StatusPill>
      </div>
    </div>
  );
}

export function RiskCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[212px] rounded-[10px] border border-border bg-surface/95 p-3.5 backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <IconChip icon={ShieldAlert} size="sm" />
        <p className="label-mono">Risk</p>
      </div>
      <p className="mt-2.5 text-[12px] text-foreground">
        Uncapped indemnity detected
      </p>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-accent">
        <div className="h-full w-[72%] rounded-full bg-risk" />
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>Severity</span>
        <span className="text-risk">High</span>
      </div>
    </div>
  );
}

/** The pipeline's final stage: per-contract AI summary, synthesized. */
export function InsightCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[248px] rounded-[10px] border border-signal/30 bg-surface/95 p-3.5 backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <IconChip icon={Sparkles} size="sm" />
        <p className="label-mono">Insight</p>
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-foreground">
        Liability is capped, but indemnity is not — and renewal notice opens
        in 30 days.
      </p>
      <div className="mt-3 flex gap-1.5">
        <StatusPill tone="signal">Synthesized</StatusPill>
      </div>
    </div>
  );
}
