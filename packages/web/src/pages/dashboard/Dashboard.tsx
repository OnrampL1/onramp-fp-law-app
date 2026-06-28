import { useAuth } from "../../hooks/useAuth";

import {
  ActivityFeed,
  AiInsightsPanel,
  DashboardHeader,
  ExpiringContractsList,
} from "../../components/dashboard";

import { KpiCards } from "@/components/dashboard/KPICard";
import { RecentContracts } from "@/components/dashboard/RecentContractsTable";
import { ContractStatusOverview } from "@/components/dashboard/ContractStatusOverview";

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

      <KpiCards />

      {/* ── Status overview  +  AI insights ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ContractStatusOverview />
        </div>
        <div className="lg:col-span-2">
          <AiInsightsPanel />
        </div>
      </div>

      {/* ── Recent contracts table ──────────────────────────────────────────── */}
      <RecentContracts />

      {/* ── Activity feed  +  Expiring contracts ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
        <div className="lg:col-span-2">
          <ExpiringContractsList />
        </div>
      </div>
    </div>
  );
}
