import { ScanLine, Layers, Radar, MessageSquareText, ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "./ContractArtifacts";

const PIPELINE: {
  icon: LucideIcon;
  label: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}[] = [
  {
    icon: ScanLine,
    label: "01 / Understanding",
    title: "Reads the document as a lawyer would",
    body: "Structure, defined terms and cross-references are resolved before extraction starts.",
    href: "#structure",
    cta: "See it in the engine",
  },
  {
    icon: Layers,
    label: "02 / Structuring",
    title: "Turns prose into typed records",
    body: "Every clause gets a position and a citation back to its source line.",
    href: "#structure",
    cta: "See it in the engine",
  },
  {
    icon: Radar,
    label: "03 / Intelligence",
    title: "Surfaces what needs attention",
    body: "Obligations and risks are flagged with a severity rating, not buried in a summary.",
    href: "#risk",
    cta: "See the full range",
  },
  {
    icon: MessageSquareText,
    label: "04 / Investigation",
    title: "Ask it directly",
    body: "Query any clause in plain language and get an answer with its citation attached.",
    href: "#investigator",
    cta: "Try the investigator",
  },
];

/** A compact overview of the engine -- each pass links to where it's actually demonstrated below. */
export function Pipeline() {
  return (
    <section id="intelligence" className="spotlight border-b border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-2xl">
          <p className="label-mono">The engine</p>
          <h2 className="mt-4 text-3xl leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[2.8rem]">
            Four deliberate passes between a signed PDF and a decision you can defend.
          </h2>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE.map((s) => (
            <a
              key={s.label}
              href={s.href}
              className="glow-surface-sm group relative block h-full rounded-lg border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-signal/40"
            >
              <Card className="h-full border-none bg-transparent p-0 shadow-none">
                <CardContent className="flex h-full flex-col p-6 lg:p-7">
                  <div className="flex items-center justify-between">
                    <div className="transition-transform duration-200 group-hover:-translate-y-0.5">
                      <IconChip icon={s.icon} />
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                      {s.label}
                    </span>
                  </div>
                  <h3 className="mt-6 text-[15px] leading-snug font-medium transition-transform duration-200 group-hover:translate-x-0.5">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                  <div className="mt-auto flex items-center gap-1.5 pt-7 text-[12px] font-medium text-muted-foreground transition-colors duration-200 group-hover:text-signal">
                    {s.cta}
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
