import type { ReactNode } from "react";
import { ScrollText, ShieldCheck, Eye } from "lucide-react";
import { IconChip } from "./ContractArtifacts";
import { RevealOnScroll } from "./RevealOnScroll";

const LEGAL_STATE: { label: string; width: string; className: string }[] = [
  { label: "Active", width: "62%", className: "bg-emerald-500" },
  { label: "Draft", width: "16%", className: "bg-amber-500" },
  { label: "Expired", width: "14%", className: "bg-muted-foreground/50" },
  { label: "Terminated", width: "8%", className: "bg-red-500" },
];

const AUDIT_LOG: { time: string; action: string; actor: string }[] = [
  { time: "09:41", action: "Risk analysis completed", actor: "A. Reinholt" },
  { time: "09:12", action: "Legal state → Active", actor: "System" },
  { time: "Yesterday", action: "Witness link issued", actor: "M. Okafor" },
];

/** One panel pattern shared by all four Control cards -- border/focus emphasis on hover, nothing hidden behind it. */
function ControlPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      tabIndex={0}
      className={`rounded-[10px] border border-border bg-surface p-5 outline-none transition-colors duration-200 hover:border-signal/40 focus-visible:border-signal/40 focus-visible:ring-2 focus-visible:ring-signal/30 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/** Intelligence you can act on and control -- not just AI output. */
export function ControlSection() {
  return (
    <section id="control" className="border-b border-border bg-[oklch(0.15_0.004_260)]">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-24">
        <RevealOnScroll>
          <p className="label-mono">Control</p>
          <h2 className="mt-4 max-w-lg text-2xl leading-[1.15] font-medium tracking-[-0.02em] text-balance sm:text-[2rem]">
            Intelligence you can act on — and a record of everyone who did.
          </h2>
        </RevealOnScroll>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <RevealOnScroll className="lg:col-span-1">
            <ControlPanel className="h-full">
              <p className="label-mono">Legal state</p>
              <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-border">
                {LEGAL_STATE.map((s) => (
                  <div
                    key={s.label}
                    className={s.className}
                    style={{ width: s.width }}
                    title={s.label}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {LEGAL_STATE.map((s) => (
                  <span
                    key={s.label}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <span className={`size-1.5 rounded-full ${s.className}`} />
                    {s.label}
                  </span>
                ))}
              </div>
            </ControlPanel>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1} className="lg:col-span-1">
            <ControlPanel className="h-full">
              <div className="flex items-center gap-2">
                <IconChip icon={ScrollText} size="sm" />
                <p className="label-mono">Audit history</p>
              </div>
              <div className="mt-4 space-y-3">
                {AUDIT_LOG.map((entry) => (
                  <div key={entry.action} className="flex items-baseline gap-2.5 text-[12px]">
                    <span className="w-14 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {entry.time}
                    </span>
                    <span className="flex-1 text-foreground">{entry.action}</span>
                    <span className="shrink-0 text-muted-foreground">{entry.actor}</span>
                  </div>
                ))}
              </div>
            </ControlPanel>
          </RevealOnScroll>

          <RevealOnScroll delay={0.2} className="flex flex-col gap-4 lg:col-span-1">
            <ControlPanel>
              <div className="flex items-center gap-2">
                <IconChip icon={ShieldCheck} size="sm" />
                <p className="label-mono">Role-based access</p>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                Owner, Admin and User roles scope exactly what each person can
                see and act on, within their organization only.
              </p>
            </ControlPanel>
            <ControlPanel>
              <div className="flex items-center gap-2">
                <IconChip icon={Eye} size="sm" />
                <p className="label-mono">Witness access</p>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                Witness links grant time-boxed, read-only access for
                signing — nothing more.
              </p>
            </ControlPanel>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
