import { useAuth } from "../../hooks/useAuth";

import {
  ActivityFeed,
  AiInsightsPanel,
  ContractStatusOverview,
  ContractTable,
  DashboardHeader,
  ExpiringContractsList,
  StatCard,
} from "../../components/dashboard/components"; 

import {
  AI_INSIGHTS,
  ACTIVITY,
  CONTRACTS,
  EXPIRING,
  STATS,
} from "../../components/dashboard/data";

/**
 * Dashboard page.
 *
 * This component is intentionally thin — it owns layout and data injection only.
 * Every visible UI block lives in its own file under ./components/.
 *
 * Layout:
 *   [Header]
 *   [Stat cards  ×4]                       1→2→4 col grid
 *   [Status overview] [AI Insights]         3+2 col on lg+
 *   [Contract table]                        full width
 *   [Activity feed]   [Expiring list]       3+2 col on lg+
 */
export function Dashboard() {
  const { user } = useAuth();
  const userName = user?.name ?? "Alex";

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <DashboardHeader userName={userName} />

      {/* ── KPI stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Status overview  +  AI insights ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ContractStatusOverview />
        </div>
        <div className="lg:col-span-2">
          <AiInsightsPanel insights={AI_INSIGHTS} />
        </div>
      </div>

      {/* ── Recent contracts table ──────────────────────────────────────────── */}
      <ContractTable contracts={CONTRACTS} />

      {/* ── Activity feed  +  Expiring contracts ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ActivityFeed items={ACTIVITY} />
        </div>
        <div className="lg:col-span-2">
          <ExpiringContractsList contracts={EXPIRING} />
        </div>
      </div>

    </div>
  );
}