import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Quote } from "lucide-react";
import { SeverityBadge } from "@/components/ui/badges";
import type { Severity } from "@/lib/data";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./RevealOnScroll";

gsap.registerPlugin(ScrollTrigger);

const FINDINGS: {
  severity: Severity;
  category: string;
  description: string;
  sourceText: string;
}[] = [
  {
    severity: "Critical",
    category: "Indemnification",
    description:
      "Indemnity obligations are uncapped, exposing the organization to unlimited liability for third-party claims.",
    sourceText:
      "…shall indemnify, defend and hold harmless the other party from and against any and all claims, without limitation as to amount…",
  },
  {
    severity: "High",
    category: "Limitation of Liability",
    description:
      "The aggregate liability cap carves out no exception for gross negligence or willful misconduct.",
    sourceText:
      "…in no event shall either party's aggregate liability exceed the fees paid in the preceding twelve (12) months…",
  },
  {
    severity: "Medium",
    category: "Auto-Renewal",
    description:
      "The agreement renews automatically unless written notice is given within a narrow 30-day window.",
    sourceText:
      "…this Agreement shall automatically renew for successive one-year terms unless either party provides notice…",
  },
];

/** Every finding, traced back to the line it came from. */
export function RiskEvidence() {
  const [hovered, setHovered] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const sources = sourceRefs.current.filter(Boolean) as HTMLDivElement[];
        gsap.set(sources, { opacity: 0, y: 10, filter: "blur(4px)" });

        // Kill on completion, then reassert final values with an
        // independent gsap.set() -- see ContractIntelligence for why this
        // two-step is required (kill() alone reverts to pre-animation
        // state; holding progress alone loses a tug-of-war with scrub's
        // own smoothing).
        let locked = false;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 75%",
            end: "bottom 60%",
            scrub: 0.6,
            onUpdate: (self) => {
              if (locked || self.progress < 1) return;
              locked = true;
              self.kill();
              gsap.set(sources, { opacity: 1, y: 0, filter: "blur(0px)" });
            },
          },
        });

        sources.forEach((el, i) => {
          tl.to(
            el,
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 1 },
            i * 0.9,
          );
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const sources = sourceRefs.current.filter(Boolean) as HTMLDivElement[];
        gsap.set(sources, { opacity: 1, y: 0, filter: "blur(0px)" });
      });
    }, gridRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="risk" className="spotlight border-b border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <RevealOnScroll>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="label-mono">Risk → Severity → Source</p>
              <h2 className="mt-4 text-3xl leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[2.8rem]">
                That uncapped indemnity was one flag. Here's the full range.
              </h2>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
              Every severity level — Low, Medium, High, Critical — carries
              the same rule: no finding without the line it came from.
            </p>
          </div>
        </RevealOnScroll>

        <div ref={gridRef} className="mt-14 grid gap-4 lg:grid-cols-3">
          {FINDINGS.map((f, i) => {
            const isHovered = hovered === i;
            const isDimmed = hovered !== null && hovered !== i;
            return (
              <RevealOnScroll key={f.category} delay={i * 0.1}>
                <div
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  className={cn(
                    "h-full rounded-[12px] border p-5 outline-none transition-all duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-signal/50",
                    f.severity === "Critical" ? "glow-surface-risk" : "glow-surface-sm",
                    isHovered
                      ? "border-signal/50 bg-surface"
                      : "border-border bg-surface",
                    isDimmed && "opacity-60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        "text-sm font-semibold transition-colors duration-200",
                        isHovered ? "text-signal" : "text-foreground",
                      )}
                    >
                      {f.category}
                    </h3>
                    <SeverityBadge severity={f.severity} />
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                  <div
                    ref={(el) => {
                      sourceRefs.current[i] = el;
                    }}
                    className={cn(
                      "mt-3.5 rounded-md border-l-2 p-2.5 transition-colors duration-200",
                      isHovered
                        ? "border-signal bg-background/90"
                        : "border-signal/40 bg-background/60",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <Quote className="size-3" />
                      Source
                    </div>
                    <p className="text-[12px] leading-relaxed text-foreground/80 italic">
                      &ldquo;{f.sourceText}&rdquo;
                    </p>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
