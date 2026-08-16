import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkle } from "lucide-react";
import { IntelligenceMachine } from "./IntelligenceMachine";
import {
  Sheet,
  ContractCard,
  ClauseCard,
  ObligationCard,
  RiskCard,
} from "./ContractArtifacts";
import { cn } from "@/lib/utils";

type Artifact = {
  x: number;
  y: number;
  rot: number;
  doc: React.ReactNode;
  card: React.ReactNode;
};

const ARTIFACTS: Artifact[] = [
  {
    x: 6,
    y: 44,
    rot: -7,
    doc: <Sheet lines={7} width={176} />,
    card: (
      <ContractCard
        title="Employment Agreement"
        counterparty="Northwind Labs GmbH"
      />
    ),
  },
  {
    x: 30,
    y: 12,
    rot: 5,
    doc: <Sheet kind="sheet" width={158} />,
    card: <ClauseCard />,
  },
  {
    x: 34,
    y: 62,
    rot: -3,
    doc: <Sheet kind="mail" lines={5} width={150} />,
    card: <ObligationCard />,
  },
  {
    x: 62,
    y: 30,
    rot: 8,
    doc: <Sheet kind="folder" lines={4} width={142} />,
    card: <RiskCard />,
  },
  {
    x: 66,
    y: 68,
    rot: -5,
    doc: <Sheet lines={6} width={164} />,
    card: (
      <ContractCard
        title="Master Services Agreement"
        counterparty="Halden & Roe LLP"
        status="Under review"
        tone="signal"
      />
    ),
  },
];

const IDLE = 1400;
const SWEEP = 3600;
const HOLD = 5200;
const RESET = 1200;
const TOTAL = IDLE + SWEEP + HOLD + RESET;

function useScanCycle() {
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setProgress(1);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) % TOTAL;
      if (t < IDLE) {
        setProgress(0);
        setScanning(false);
      } else if (t < IDLE + SWEEP) {
        const p = (t - IDLE) / SWEEP;
        setProgress(p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        setScanning(true);
      } else if (t < IDLE + SWEEP + HOLD) {
        setProgress(1);
        setScanning(false);
      } else {
        setProgress(0);
        setScanning(false);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return { progress, scanning };
}

const CAPABILITIES: [string, string][] = [
  ["Source-cited", "Every clause traces to its line"],
  ["Ask & verify", "Query clauses, get cited answers"],
  ["Fully audited", "Every analysis stays traceable"],
];

export function Hero() {
  const { progress, scanning } = useScanCycle();
  const beam = 8 + progress * 70; // % across the stage

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 stage-grid opacity-[0.55]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,transparent_35%,var(--background)_100%)]" />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-6 pt-28 pb-20 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-10 lg:px-10 lg:pt-36 lg:pb-28">
        {/* Editorial column */}
        <div className="relative z-10 max-w-xl self-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1">
            <Sparkle className="size-3 text-signal" strokeWidth={2} />
            <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Contract intelligence engine
            </span>
          </div>

          <h1 className="text-[2.75rem] leading-[1.02] font-medium tracking-[-0.035em] text-balance text-foreground sm:text-6xl">
            Contracts, read as
            <span className="block text-muted-foreground">
              structure — not paper.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Clausio scans every agreement in your estate and returns clauses,
            obligations, risks and renewals as traceable records — each one
            linked back to the exact line it came from.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#intelligence"
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              See the engine
              <ArrowRight className="size-4" strokeWidth={2} />
            </a>
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-[10px] border border-border-strong px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign in
            </Link>
          </div>

          <dl className="mt-14 grid max-w-md grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-3">
            {CAPABILITIES.map(([k, v]) => (
              <div key={k} className="bg-surface px-3 py-3.5">
                <dt className="text-[13px] font-medium text-foreground">{k}</dt>
                <dd className="mt-1 text-[11px] leading-tight text-muted-foreground">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Stage */}
        <div className="relative">
          <div className="relative h-[520px] w-full overflow-hidden rounded-[12px] border border-border bg-[oklch(0.145_0.004_260)] sm:h-[560px]">
            <div className="absolute inset-0 stage-grid opacity-40" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_45%,oklch(0.24_0.004_260/0.9),transparent_75%)]" />

            {/* rail */}
            <div className="absolute inset-x-0 top-0 h-9 border-b border-border bg-surface/70">
              <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-border-strong" />
              <div className="absolute top-2.5 left-4 font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                Clausio · optical intake
              </div>
              <div className="absolute top-2.5 right-4 font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                {scanning
                  ? "scanning"
                  : progress === 1
                    ? "structured"
                    : "standby"}
              </div>
            </div>

            {/* artifacts */}
            {ARTIFACTS.map((a, i) => {
              const passed = 8 + progress * 70 > a.x + 3;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${a.x}%`,
                    top: `${a.y}%`,
                    width: 0,
                    height: 0,
                  }}
                >
                  <div className="relative">
                    <AnimatePresence initial={false} mode="wait">
                      {passed ? (
                        <motion.div
                          key="card"
                          initial={{ opacity: 0, y: 12, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{
                            duration: 0.45,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          {a.card}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="doc"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, rotate: a.rot }}
                          exit={{
                            opacity: 0,
                            filter: "blur(6px)",
                            scale: 0.96,
                          }}
                          transition={{ duration: 0.4 }}
                          style={{ rotate: a.rot }}
                        >
                          {a.doc}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            {/* scan beam */}
            <div
              className="pointer-events-none absolute top-9 bottom-0 w-px"
              style={{
                left: `${beam}%`,
                opacity: scanning ? 1 : 0,
                transition: "opacity 400ms ease",
              }}
            >
              <div className="absolute inset-y-0 -left-10 w-20 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--signal)_18%,transparent),transparent)]" />
              <div className="absolute inset-y-0 left-0 w-px bg-signal/70" />
            </div>

            {/* machine carriage */}
            <div
              className="pointer-events-none absolute top-2 z-20"
              style={{
                left: `calc(${beam}% - 98px)`,
                transition: "left 60ms linear",
              }}
            >
              <IntelligenceMachine active={scanning} />
            </div>

            {/* readout */}
            <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              <span>Intake → parse → structure</span>
              <span className={cn(scanning && "text-signal")}>
                {String(Math.round(progress * 100)).padStart(3, "0")}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
