import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { STATUS_BAR_STYLES } from "../types/styles";
import type { ContractStatus } from "../types";

interface StatusSegment {
  label: ContractStatus;
  count: number;
  pct: number;
}

// Ordered list driving both the bar and the legend.
const SEGMENTS: StatusSegment[] = [
  { label: "Draft",      count: 184,  pct: 6.5  },
  { label: "Active",     count: 1932, pct: 67.9 },
  { label: "Expired",    count: 587,  pct: 20.6 },
  { label: "Terminated", count: 144,  pct: 5.1  },
];

/**
 * Segmented progress bar showing the distribution of contracts by status,
 * with a 2×2 / 4-column legend beneath it.
 */
export function ContractStatusOverview() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Contract Status Overview</CardTitle>
        <CardDescription>Distribution across the full portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Segmented bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {SEGMENTS.map((s) => (
            <div
              key={s.label}
              className={STATUS_BAR_STYLES[s.label]}
              style={{ width: `${s.pct}%` }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SEGMENTS.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_BAR_STYLES[s.label]}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-lg font-bold">{s.count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{s.pct}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}