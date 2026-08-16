import { FileText, Quote, ShieldCheck, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { RevealOnScroll } from "./RevealOnScroll";

const QUESTION = "What happens if this agreement is terminated early?";

const ANSWER =
  "Either party may terminate for convenience with 60 days' written notice. Fees accrued through the effective date remain payable, and the confidentiality obligations survive termination.";

const SOURCE = {
  clause: "14.2",
  title: "Early Termination",
  excerpt:
    "Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice to the other party...",
};

/**
 * A marketing visualization of the real Clause Investigator
 * (packages/web/src/pages/contracts/ContractInvestigator.tsx,
 * routed at /contracts/:id/investigator). Static -- not wired to the
 * live API. Mirrors that page's real bubble/citation layout.
 */
export function InvestigatorPreview() {
  return (
    <section id="investigator" className="border-b border-border">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-6 py-24 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:px-10 lg:py-32">
        <RevealOnScroll>
          <p className="label-mono">Clause Investigator</p>
          <h2 className="mt-4 max-w-md text-3xl leading-[1.1] font-medium tracking-[-0.03em] text-balance sm:text-[2.6rem]">
            Don't search the contract. Ask it.
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            Clausio doesn't just summarize an agreement — you can question it
            directly, in plain language, and every answer traces back to the
            exact clause it came from.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={0.15}>
          <Card className="mx-auto w-full max-w-xl border-border bg-card p-0 shadow-[0_60px_120px_-60px_oklch(0_0_0/0.9)]">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Sparkles className="size-4 text-signal" strokeWidth={2} />
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Clause Investigator · Master Services Agreement
              </span>
            </div>

            <div className="space-y-5 p-5">
              {/* user question */}
              <div className="flex justify-end gap-3">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[13px] text-primary-foreground">
                  {QUESTION}
                </div>
                <Avatar className="mt-0.5 size-7 shrink-0">
                  <AvatarFallback className="bg-muted text-[11px] font-medium">
                    AR
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* answer */}
              <div className="flex gap-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-[13px] leading-relaxed text-foreground">
                    {ANSWER}
                  </p>

                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FileText className="size-3.5" />1 source reference
                    </p>
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                          {SOURCE.clause}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {SOURCE.title}
                        </span>
                      </div>
                      <div className="flex gap-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                        <Quote className="size-3 shrink-0 opacity-60" />
                        <span className="text-pretty">{SOURCE.excerpt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-ok" />
                    <span>Grounded answer · 94% confidence</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <p className="mx-auto mt-4 max-w-xl text-center text-[12px] text-muted-foreground">
            A real Clausio capability, shown here as a preview.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
