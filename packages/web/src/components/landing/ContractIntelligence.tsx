import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Scale,
  CalendarClock,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "./ContractArtifacts";
import { RevealOnScroll } from "./RevealOnScroll";
import { SensorPulse } from "./SensorPulse";

gsap.registerPlugin(ScrollTrigger);

/**
 * One shape for every stage, including the payoff -- a wide horizontal
 * banner (icon left, content right), not a small vertical box. Escalating
 * glow (none/sm -> risk -> full signal) is the only thing that visually
 * separates "still being processed" from "worth noticing" from "the
 * destination," everything else about the shape is identical.
 */
function PipelineBanner({
  icon: Icon,
  label,
  pill,
  active,
  dimmed,
  glow,
  children,
}: {
  icon: LucideIcon;
  label: string;
  pill?: ReactNode;
  active: boolean;
  dimmed: boolean;
  glow?: "risk" | "signal";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[20px] border bg-surface/95 px-8 py-10 text-center backdrop-blur-[2px] transition-all duration-200 sm:flex-row sm:items-start sm:gap-6 sm:text-left",
        glow === "signal"
          ? "glow-surface"
          : glow === "risk"
            ? "glow-surface-risk"
            : "glow-surface-sm",
        active ? "-translate-y-1 border-signal/60" : glow ? "border-signal/30" : "border-border",
        dimmed && "opacity-50",
      )}
    >
      <div
        className={cn(
          "flex size-14 shrink-0 items-center justify-center rounded-2xl border",
          glow
            ? "border-signal/30 bg-signal/10 text-signal"
            : "border-border bg-surface-raised text-muted-foreground",
        )}
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-center gap-2.5 sm:justify-start">
          <p className="label-mono">{label}</p>
          {pill}
        </div>
        {children}
      </div>
    </div>
  );
}

function BannerStatement({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-lg leading-snug font-medium text-balance text-foreground sm:text-xl">
      {children}
    </p>
  );
}

function BannerCaption({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[13px] text-muted-foreground">{children}</p>;
}

/**
 * A connector between two stages. On mobile it's always a vertical
 * line+chevron (the flow stacks in one column). On desktop, connectors
 * between a row's two cards switch to a horizontal line+chevron via
 * `horizontalOnDesktop`; connectors between rows stay vertical.
 */
function Connector({
  area,
  horizontalOnDesktop,
  refCallback,
}: {
  area: string;
  horizontalOnDesktop?: boolean;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={refCallback} style={{ gridArea: area }} className="flex items-center justify-center py-2 lg:py-0">
      <div className={cn("flex flex-col items-center", horizontalOnDesktop && "lg:hidden")}>
        <div className="h-8 w-px bg-gradient-to-b from-border to-signal/50" />
        <ChevronDown className="-mt-1 size-4 text-signal" strokeWidth={1.75} />
      </div>
      {horizontalOnDesktop && (
        <div className="hidden items-center lg:flex">
          <div className="h-px w-10 bg-gradient-to-r from-border to-signal/50" />
          <ChevronRight className="-ml-1 size-4 text-signal" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}

function StageSlot({
  area,
  index,
  stage,
  hovered,
  setHovered,
  refCallback,
}: {
  area: string;
  index: number;
  stage: {
    label: string;
    icon: LucideIcon;
    pill: ReactNode;
    glow?: "risk" | "signal";
    content: ReactNode;
  };
  hovered: number | null;
  setHovered: (i: number | null) => void;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      style={{ gridArea: area }}
      ref={refCallback}
      tabIndex={0}
      className="w-full rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(index)}
      onBlur={() => setHovered(null)}
    >
      <PipelineBanner
        icon={stage.icon}
        label={stage.label}
        pill={stage.pill}
        active={hovered === index}
        dimmed={hovered !== null && hovered !== index}
        glow={stage.glow}
      >
        {stage.content}
      </PipelineBanner>
    </div>
  );
}

/** The pipeline flythrough: a contract decomposing into structured records, culminating in the synthesized insight. */
export function ContractIntelligence() {
  const [hovered, setHovered] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const bannerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const connectorRefs = useRef<(HTMLDivElement | null)[]>([]);

  const stages: {
    label: string;
    icon: LucideIcon;
    pill: ReactNode;
    glow?: "risk" | "signal";
    content: ReactNode;
  }[] = [
    {
      label: "01 / Contract",
      icon: FileText,
      pill: <StatusPill tone="ok">Active</StatusPill>,
      content: (
        <>
          <BannerStatement>
            Master Services Agreement — Halden &amp; Roe LLP
          </BannerStatement>
          <BannerCaption>
            Recognized and structured before a single clause is read.
          </BannerCaption>
        </>
      ),
    },
    {
      label: "02 / Clause 8.2",
      icon: Scale,
      pill: <StatusPill tone="signal">Extracted</StatusPill>,
      content: (
        <>
          <BannerStatement>
            Aggregate liability capped at 120% of fees paid in the preceding
            12 months.
          </BannerStatement>
          <BannerCaption>
            Every clause becomes a typed record with a citation back to its
            source line.
          </BannerCaption>
        </>
      ),
    },
    {
      label: "03 / Obligation",
      icon: CalendarClock,
      pill: <StatusPill tone="risk">T-30d</StatusPill>,
      content: (
        <>
          <BannerStatement>
            Renewal notice window opens — 2026-09-14.
          </BannerStatement>
          <BannerCaption>Thirty days out, and already on the record.</BannerCaption>
        </>
      ),
    },
    {
      label: "04 / Risk",
      icon: ShieldAlert,
      glow: "risk",
      pill: <StatusPill tone="risk">High</StatusPill>,
      content: (
        <>
          <BannerStatement>Uncapped indemnity detected.</BannerStatement>
          <BannerCaption>
            Flagged with a severity rating and the exact line it came from.
          </BannerCaption>
          <div className="mt-3 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-accent">
            <div className="h-full w-[72%] rounded-full bg-risk" />
          </div>
        </>
      ),
    },
    {
      label: "05 / Insight",
      icon: Sparkles,
      glow: "signal",
      pill: <StatusPill tone="signal">Synthesized</StatusPill>,
      content: (
        <>
          <BannerStatement>
            Liability is capped, but indemnity is not — and the renewal
            notice window opens in 30 days.
          </BannerStatement>
          <BannerCaption>Four passes, one contract, no page left unread.</BannerCaption>
        </>
      ),
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const bannerEls = bannerRefs.current.filter(Boolean) as HTMLDivElement[];
        const connectorEls = connectorRefs.current.filter(Boolean) as HTMLDivElement[];

        gsap.set(bannerEls, { opacity: 0, y: 28 });
        gsap.set(connectorEls, { opacity: 0, scaleY: 0, transformOrigin: "top" });

        const step = 1;
        // Kill on completion, then reassert final values with an
        // independent gsap.set(). Killing a scrub-tied ScrollTrigger
        // reverts the tween's properties back to their pre-animation
        // state rather than freezing them, and just holding progress at 1
        // loses a tug-of-war with scrub's own smoothing -- both were
        // tried and both left elements stuck mid-transition.
        let locked = false;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 78%",
            end: "bottom 60%",
            scrub: 0.6,
            onUpdate: (self) => {
              if (locked || self.progress < 1) return;
              locked = true;
              self.kill();
              gsap.set(bannerEls, { opacity: 1, y: 0 });
              gsap.set(connectorEls, { opacity: 1, scaleY: 1 });
            },
          },
        });

        bannerEls.forEach((banner, i) => {
          tl.to(banner, { opacity: 1, y: 0, duration: step * 0.7 }, i * step);
          const connector = connectorEls[i];
          if (connector) {
            tl.to(
              connector,
              { opacity: 1, scaleY: 1, duration: step * 0.5 },
              i * step + step * 0.5,
            );
          }
        });

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const bannerEls = bannerRefs.current.filter(Boolean) as HTMLDivElement[];
        const connectorEls = connectorRefs.current.filter(Boolean) as HTMLDivElement[];
        gsap.set(bannerEls, { opacity: 1, y: 0 });
        gsap.set(connectorEls, { opacity: 1, scaleY: 1 });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="structure"
      ref={sectionRef}
      className="spotlight relative overflow-hidden border-b border-border"
    >
      <div className="pointer-events-none absolute inset-0 stage-grid opacity-30" />
      <SensorPulse />
      <div className="relative z-[1] mx-auto max-w-[1400px] px-6 py-28 lg:px-10 lg:py-36">
        <RevealOnScroll>
          <div className="max-w-2xl">
            <p className="label-mono">Contract intelligence</p>
            <h2 className="mt-4 text-3xl leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[2.8rem]">
              A contract stops being a document and becomes structured
              intelligence.
            </h2>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
              The same estate document, followed through the engine — from a
              signed PDF to clauses, obligations and risks, ending in one
              synthesized read on what matters.
            </p>
          </div>
        </RevealOnScroll>

        <div className="ci-flow-grid relative mt-16">
          <StageSlot
            area="c1"
            index={0}
            stage={stages[0]}
            hovered={hovered}
            setHovered={setHovered}
            refCallback={(el) => {
              bannerRefs.current[0] = el;
            }}
          />
          <Connector
            area="n1"
            horizontalOnDesktop
            refCallback={(el) => {
              connectorRefs.current[0] = el;
            }}
          />
          <StageSlot
            area="c2"
            index={1}
            stage={stages[1]}
            hovered={hovered}
            setHovered={setHovered}
            refCallback={(el) => {
              bannerRefs.current[1] = el;
            }}
          />
          <Connector
            area="n2"
            refCallback={(el) => {
              connectorRefs.current[1] = el;
            }}
          />
          <StageSlot
            area="c3"
            index={2}
            stage={stages[2]}
            hovered={hovered}
            setHovered={setHovered}
            refCallback={(el) => {
              bannerRefs.current[2] = el;
            }}
          />
          <Connector
            area="n3"
            horizontalOnDesktop
            refCallback={(el) => {
              connectorRefs.current[2] = el;
            }}
          />
          <StageSlot
            area="c4"
            index={3}
            stage={stages[3]}
            hovered={hovered}
            setHovered={setHovered}
            refCallback={(el) => {
              bannerRefs.current[3] = el;
            }}
          />
          <Connector
            area="n4"
            refCallback={(el) => {
              connectorRefs.current[3] = el;
            }}
          />
          <StageSlot
            area="c5"
            index={4}
            stage={stages[4]}
            hovered={hovered}
            setHovered={setHovered}
            refCallback={(el) => {
              bannerRefs.current[4] = el;
            }}
          />
        </div>
      </div>
    </section>
  );
}
