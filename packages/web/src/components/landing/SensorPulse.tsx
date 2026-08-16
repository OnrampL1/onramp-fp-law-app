import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const POINTS: { left: string; top: string; delay: string }[] = [
  { left: "12%", top: "22%", delay: "0s" },
  { left: "78%", top: "15%", delay: "1.6s" },
  { left: "34%", top: "68%", delay: "3.1s" },
  { left: "92%", top: "55%", delay: "0.8s" },
  { left: "58%", top: "82%", delay: "4.2s" },
  { left: "6%", top: "78%", delay: "2.4s" },
];

/**
 * Sparse, slow points of light on the background engineering grid --
 * pure CSS (no JS animation loop), respects prefers-reduced-motion.
 * "The instrument is always scanning," not a decorative starfield.
 */
export function SensorPulse() {
  return (
    <div className="sensor-pulse" aria-hidden="true">
      {POINTS.map((p, i) => (
        <span
          key={i}
          style={{ left: p.left, top: p.top, ["--pulse-delay" as string]: p.delay }}
        />
      ))}
    </div>
  );
}

const ACTIVATE_POINTS: { left: string; top: string; delay: number }[] = [
  { left: "8%", top: "18%", delay: 0 },
  { left: "88%", top: "12%", delay: 0.5 },
  { left: "20%", top: "72%", delay: 1 },
  { left: "95%", top: "60%", delay: 1.5 },
  { left: "48%", top: "88%", delay: 2 },
  { left: "4%", top: "50%", delay: 2.5 },
  { left: "70%", top: "30%", delay: 3 },
];

function ActivateDot({ left, top, delay }: { left: string; top: string; delay: number }) {
  const [settled, setSettled] = useState(false);

  return (
    <motion.span
      className="absolute size-[3px] rounded-full bg-signal"
      style={{ left, top }}
      initial={{ opacity: 0, scale: 0 }}
      animate={
        settled
          ? { opacity: [0, 0.7, 0], scale: [1, 3, 1] }
          : { opacity: [0, 1, 0.4], scale: [0, 2.6, 1] }
      }
      transition={
        settled
          ? { duration: 7, repeat: Infinity, ease: "easeInOut", delay }
          : { duration: 1, delay: 0.4 + delay, ease: [0.16, 1, 0.3, 1] }
      }
      onAnimationComplete={() => {
        if (!settled) setSettled(true);
      }}
    />
  );
}

/**
 * Same sensor-pulse idea, but with a one-time "power-on" flash sequence
 * when it first mounts, then settles into the same slow ambient loop.
 * For the hero, where the instrument should feel like it's booting up.
 * Fully skipped under prefers-reduced-motion (purely decorative).
 */
export function SensorPulseActivate() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {ACTIVATE_POINTS.map((p, i) => (
        <ActivateDot key={i} {...p} />
      ))}
    </div>
  );
}
