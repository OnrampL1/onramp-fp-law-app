import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { RevealOnScroll } from "./RevealOnScroll";
import { SensorPulse } from "./SensorPulse";

/** The conclusion of the transformation story. */
export function FinalCTA() {
  return (
    <section id="cta" className="spotlight spotlight-tight relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 stage-grid opacity-40" />
      <SensorPulse />
      <div className="relative z-[1] mx-auto max-w-[1400px] px-6 py-28 lg:px-10 lg:py-36">
        <div className="mx-auto max-w-2xl text-center">
          <RevealOnScroll>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Contracts shouldn't remain documents.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={0.15}>
            <h2 className="mt-2 text-3xl leading-[1.08] font-medium tracking-[-0.03em] text-balance sm:text-[3rem]">
              They should become intelligence.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay={0.3}>
            <p className="mt-3 font-mono text-[13px] tracking-[0.1em] text-signal uppercase">
              Clausio
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={0.45}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Sign in
                <ArrowUpRight className="size-4" strokeWidth={2} />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-[10px] border border-border-strong px-5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                Request access
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
