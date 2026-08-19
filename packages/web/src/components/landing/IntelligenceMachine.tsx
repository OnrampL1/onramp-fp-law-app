import { motion } from "motion/react";

/**
 * Clausio Intelligence Machine.
 * An autonomous industrial optical scanner: rail carriage, articulated arm,
 * sensor head with a precision lens. No face, no character behaviour.
 */
export function IntelligenceMachine({ active }: { active: boolean }) {
  return (
    <svg
      width="196"
      height="176"
      viewBox="0 0 196 176"
      fill="none"
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="metalV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--metal-edge)" />
          <stop offset="55%" stopColor="var(--metal)" />
          <stop offset="100%" stopColor="var(--surface)" />
        </linearGradient>
        <linearGradient id="metalH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--surface)" />
          <stop offset="40%" stopColor="var(--metal)" />
          <stop offset="100%" stopColor="var(--metal-edge)" />
        </linearGradient>
      </defs>

      {/* carriage on the rail */}
      <g>
        <rect
          x="54"
          y="0"
          width="88"
          height="20"
          rx="5"
          fill="url(#metalH)"
          stroke="var(--metal-edge)"
          strokeWidth="1"
        />
        <rect
          x="66"
          y="6"
          width="26"
          height="8"
          rx="2"
          fill="var(--background)"
          opacity="0.6"
        />
        <circle
          cx="128"
          cy="10"
          r="3"
          fill={active ? "var(--signal)" : "var(--metal-edge)"}
        />
      </g>

      {/* upper arm segment */}
      <motion.g
        style={{ originX: "98px", originY: "20px" }}
        animate={{ rotate: active ? [-8, -3, -6] : -8 }}
        transition={{ duration: 3.2, ease: [0.65, 0, 0.35, 1] }}
      >
        <rect
          x="88"
          y="18"
          width="20"
          height="70"
          rx="6"
          fill="url(#metalV)"
          stroke="var(--metal-edge)"
          strokeWidth="1"
        />
        <line
          x1="98"
          y1="30"
          x2="98"
          y2="78"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <circle
          cx="98"
          cy="20"
          r="8"
          fill="var(--surface-raised)"
          stroke="var(--metal-edge)"
          strokeWidth="1"
        />

        {/* elbow + forearm */}
        <motion.g
          style={{ originX: "98px", originY: "88px" }}
          animate={{ rotate: active ? [14, 4, 10] : 14 }}
          transition={{ duration: 3.2, ease: [0.65, 0, 0.35, 1] }}
        >
          <circle
            cx="98"
            cy="88"
            r="9"
            fill="var(--surface-raised)"
            stroke="var(--metal-edge)"
            strokeWidth="1"
          />
          <rect
            x="90"
            y="86"
            width="16"
            height="46"
            rx="5"
            fill="url(#metalV)"
            stroke="var(--metal-edge)"
            strokeWidth="1"
          />

          {/* sensor head */}
          <g>
            <rect
              x="66"
              y="128"
              width="64"
              height="34"
              rx="9"
              fill="url(#metalV)"
              stroke="var(--metal-edge)"
              strokeWidth="1"
            />
            <rect
              x="72"
              y="134"
              width="14"
              height="4"
              rx="2"
              fill="var(--border-strong)"
            />
            <rect
              x="72"
              y="142"
              width="9"
              height="4"
              rx="2"
              fill="var(--border-strong)"
            />
            {/* optical lens */}
            <circle
              cx="110"
              cy="145"
              r="12"
              fill="var(--background)"
              stroke="var(--metal-edge)"
              strokeWidth="1.5"
            />
            <motion.circle
              cx="110"
              cy="145"
              r="6"
              fill="var(--signal)"
              animate={{ opacity: active ? [0.35, 1, 0.7] : 0.18 }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
            />
            <circle
              cx="110"
              cy="145"
              r="2"
              fill="var(--background)"
              opacity="0.7"
            />
            {/* emitter aperture */}
            <rect
              x="74"
              y="160"
              width="48"
              height="5"
              rx="2.5"
              fill={active ? "var(--signal)" : "var(--metal)"}
              opacity={active ? 0.8 : 1}
            />
          </g>
        </motion.g>
      </motion.g>
    </svg>
  );
}
