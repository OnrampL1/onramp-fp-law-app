import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Sheet,
  ContractCard,
  ClauseCard,
  ObligationCard,
  RiskCard,
  InsightCard,
} from "./ContractArtifacts";
import { RevealOnScroll } from "./RevealOnScroll";

const STAGES: { label: string; node: ReactNode }[] = [
  {
    label: "01 / Contract",
    node: (
      <div className="relative h-[172px] w-[176px]">
        <div className="absolute top-3 left-3 rotate-[4deg] opacity-60">
          <Sheet lines={7} width={150} />
        </div>
        <div className="absolute top-0 left-0">
          <ContractCard
            title="Master Services Agreement"
            counterparty="Halden & Roe LLP"
            className="w-[176px]"
          />
        </div>
      </div>
    ),
  },
  {
    label: "02 / Clauses",
    node: <ClauseCard className="w-[176px]" />,
  },
  {
    label: "03 / Obligations",
    node: <ObligationCard className="w-[176px]" />,
  },
  {
    label: "04 / Risks",
    node: <RiskCard className="w-[176px]" />,
  },
  {
    label: "05 / Insights",
    node: <InsightCard className="w-[176px]" />,
  },
];

/** The pipeline flythrough: a contract decomposing into structured records. */
export function ContractIntelligence() {
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

        <div className="mt-16 flex flex-col items-center gap-4 overflow-x-auto pb-4 lg:flex-row lg:items-start lg:justify-between lg:gap-2 lg:overflow-visible">
          {STAGES.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-2 lg:contents">
              <RevealOnScroll delay={i * 0.12} className="flex flex-col items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {stage.label}
                </span>
                {stage.node}
              </RevealOnScroll>
              {i < STAGES.length - 1 && (
                <ChevronRight
                  className="hidden size-5 shrink-0 self-center text-muted-foreground/40 lg:block"
                  strokeWidth={1.5}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
