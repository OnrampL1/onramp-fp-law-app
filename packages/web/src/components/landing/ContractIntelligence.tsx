import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronRight,
  FileText,
  Scale,
  CalendarClock,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, IconChip, StatusPill } from "./ContractArtifacts";
import { RevealOnScroll } from "./RevealOnScroll";

/**
 * One structural pattern for every stage: fixed size, header row pinned to
 * the top, body allowed to flex, meta/footer pinned to the bottom via
 * mt-auto -- so title and footer positions line up across all five cards
 * regardless of how much body content each one has.
 */
function StageCard({
  icon,
  label,
  children,
  meta,
  active,
  dimmed,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  meta: ReactNode;
  active: boolean;
  dimmed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-44 w-44 flex-col rounded-[10px] border bg-surface/95 p-3.5 backdrop-blur-[2px] transition-all duration-200",
        active ? "border-signal/50" : "border-border",
        dimmed && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2">
        <IconChip icon={icon} size="sm" />
        <p className="label-mono truncate">{label}</p>
      </div>
      <div className="mt-2.5 flex-1 overflow-hidden text-[12px] leading-relaxed text-foreground">
        {children}
      </div>
      <div className="mt-auto pt-2.5">{meta}</div>
    </div>
  );
}

function ContractStage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute top-0 right-0 rotate-[6deg] opacity-50">
        <Sheet lines={5} width={92} />
      </div>
      <div className="absolute bottom-0 left-0 max-w-[130px] rounded-md border border-border bg-surface-raised/95 px-2 py-1.5">
        <p className="truncate text-[11px] font-medium text-foreground">
          Master Services Agmt.
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          Halden &amp; Roe LLP
        </p>
      </div>
    </div>
  );
}

/** The pipeline flythrough: a contract decomposing into structured records. */
export function ContractIntelligence() {
  const [hovered, setHovered] = useState<number | null>(null);

  const stages: {
    label: string;
    icon: LucideIcon;
    body: ReactNode;
    meta: ReactNode;
  }[] = [
    {
      label: "Contract",
      icon: FileText,
      body: <ContractStage />,
      meta: <StatusPill tone="ok">Active</StatusPill>,
    },
    {
      label: "Clause 8.2",
      icon: Scale,
      body: (
        <p>
          Aggregate liability capped at{" "}
          <span className="text-foreground">120% of fees paid</span> in the
          preceding 12 months.
        </p>
      ),
      meta: <StatusPill tone="signal">Extracted</StatusPill>,
    },
    {
      label: "Obligation",
      icon: CalendarClock,
      body: <p>Renewal notice window opens</p>,
      meta: (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground">
            2026-09-14
          </span>
          <StatusPill tone="risk">T-30d</StatusPill>
        </div>
      ),
    },
    {
      label: "Risk",
      icon: ShieldAlert,
      body: <p>Uncapped indemnity detected</p>,
      meta: (
        <div className="space-y-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-accent">
            <div className="h-full w-[72%] rounded-full bg-risk" />
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>Severity</span>
            <span className="text-risk">High</span>
          </div>
        </div>
      ),
    },
    {
      label: "Insight",
      icon: Sparkles,
      body: (
        <p>
          Liability is capped, but indemnity is not — renewal notice opens in
          30 days.
        </p>
      ),
      meta: <StatusPill tone="signal">Synthesized</StatusPill>,
    },
  ];

  return (
    <section id="structure" className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 stage-grid opacity-30" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <RevealOnScroll>
          <div className="max-w-2xl">
            <p className="label-mono">Contract intelligence</p>
            <h2 className="mt-4 text-3xl leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[2.6rem]">
              A contract stops being a document and becomes structured
              intelligence.
            </h2>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
              The same estate document, followed through the engine — from a
              signed PDF to clauses, obligations, risks and a synthesized
              read on what matters.
            </p>
          </div>
        </RevealOnScroll>

        <div className="mt-16 flex flex-col items-center gap-6 overflow-x-auto pb-4 lg:flex-row lg:items-start lg:justify-between lg:gap-2 lg:overflow-visible">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-2 lg:contents">
              <RevealOnScroll delay={i * 0.12} className="flex flex-col items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {String(i + 1).padStart(2, "0")} / {stage.label}
                </span>
                <div
                  tabIndex={0}
                  className="rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                >
                  <StageCard
                    icon={stage.icon}
                    label={stage.label}
                    meta={stage.meta}
                    active={hovered === i}
                    dimmed={hovered !== null && hovered !== i}
                  >
                    {stage.body}
                  </StageCard>
                </div>
              </RevealOnScroll>
              {i < stages.length - 1 && (
                <RevealOnScroll
                  delay={i * 0.12 + 0.06}
                  className="hidden self-center lg:block"
                >
                  <ChevronRight
                    className={cn(
                      "size-5 shrink-0 transition-colors duration-200",
                      hovered === i || hovered === i + 1
                        ? "text-signal"
                        : "text-muted-foreground/40",
                    )}
                    strokeWidth={1.5}
                  />
                </RevealOnScroll>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
