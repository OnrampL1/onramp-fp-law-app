import { ScanLine, Layers, Radar, GitBranch, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "./ContractArtifacts";

const PIPELINE: {
  icon: LucideIcon;
  label: string;
  title: string;
  body: string;
}[] = [
  {
    icon: ScanLine,
    label: "01 / Understanding",
    title: "Reads the document as a lawyer would",
    body: "Layout, defined terms, cross-references and annexes are resolved before a single clause is extracted.",
  },
  {
    icon: Layers,
    label: "02 / Structuring",
    title: "Turns prose into records",
    body: "Every clause becomes a typed record with a position and a citation back to the exact source line.",
  },
  {
    icon: Radar,
    label: "03 / Intelligence",
    title: "Surfaces what needs attention",
    body: "Obligations, caps, renewals and indemnities are flagged with a severity rating and the source line behind it.",
  },
  {
    icon: GitBranch,
    label: "04 / Control",
    title: "Ask it directly, or let it watch",
    body: "Query any clause and get a cited answer, while legal state, expirations and every analysis stay logged in one auditable record.",
  },
];

/** Scroll-revealed intelligence pipeline: contract → clauses → obligations → risks → insights. */
export function Pipeline() {
  return (
    <section id="intelligence" className="border-b border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-2xl">
          <p className="label-mono">The engine</p>
          <h2 className="mt-4 text-3xl leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[2.6rem]">
            Four deliberate passes between a signed PDF and a decision you can defend.
          </h2>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE.map((s) => (
            <Card
              key={s.label}
              className="group relative border-border bg-surface p-0 shadow-none"
            >
              <CardContent className="p-6 lg:p-7">
                <div className="flex items-center justify-between">
                  <IconChip icon={s.icon} />
                  <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {s.label}
                  </span>
                </div>
                <h3 className="mt-6 text-[15px] leading-snug font-medium">{s.title}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
                <div className="mt-7 h-px w-full bg-border">
                  <div className="h-px w-0 bg-foreground/60 transition-all duration-700 group-hover:w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
