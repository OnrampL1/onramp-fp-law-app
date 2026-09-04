import { useAuth } from "../../hooks/useAuth";

import {
  ActivityFeed,
  AiInsightsPanel,
  DashboardHeader,
  ExpiringContractsList,
} from "../../components/dashboard";

import {
  CalendarClock,
  ClipboardList,
  FileCheck2,
  FileText,
} from "lucide-react";
import { KpiCards, type KpiCardItem } from "@/components/dashboard/KPICard";
import { RecentContracts } from "@/components/dashboard/RecentContractsTable";
import { ContractStatusOverview } from "@/components/dashboard/ContractStatusOverview";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";

function formatCount(value: number | undefined, isLoading: boolean): string {
  if (isLoading) return "...";
  return (value ?? 0).toLocaleString();
}

export function Dashboard() {
  const { user } = useAuth();
  const userName = user?.fullName ?? "there";

  const {
    data: dashboardSummary,
    isLoading,
    isError,
    refetch,
  } = useDashboardSummary();

  const contracts = dashboardSummary?.contracts;
  const hasExpiringSoon = (contracts?.expiringSoon.length ?? 0) > 0;

  const kpiItems: KpiCardItem[] = [
    {
      icon: <FileText className="size-5" />,
      value: formatCount(contracts?.total, isLoading),
      label: "Total Contracts",
      sublabel: "Organization portfolio",
      iconClassName: "bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300",
    },
    {
      icon: <FileCheck2 className="size-5" />,
      value: formatCount(contracts?.legalStateCounts.ACTIVE, isLoading),
      label: "Active Contracts",
      sublabel:
        contracts && contracts.total > 0
          ? `${((contracts.legalStateCounts.ACTIVE / contracts.total) * 100).toFixed(1)}% of portfolio`
          : "Legal state: active",
      iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
    },
    {
      icon: <CalendarClock className="size-5" />,
      value: formatCount(contracts?.expiringSoonCount, isLoading),
      label: "Expiring Soon",
      sublabel: "Within 30 days",
      iconClassName: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
    },
    {
      icon: <ClipboardList className="size-5" />,
      value: formatCount(
        contracts?.businessStatusCounts.UNDER_REVIEW,
        isLoading,
      ),
      label: "Under Review",
      sublabel: "Business workflow status",
      iconClassName: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader userName={userName} />

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Dashboard metrics could not be loaded.</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-medium underline underline-offset-4"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <KpiCards items={kpiItems} />

      {/* Legal State Overview shares the row 50/50 with Expiring Contracts
          only when there's something to show there - with nothing expiring
          soon, a half-empty "Expiring Contracts" card next to it is just
          wasted space, so Legal State Overview takes the full row instead. */}
      {hasExpiringSoon ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <ContractStatusOverview
            counts={contracts?.legalStateCounts}
            total={contracts?.total ?? 0}
            isLoading={isLoading}
          />
          <ExpiringContractsList
            contracts={contracts?.expiringSoon}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <ContractStatusOverview
          counts={contracts?.legalStateCounts}
          total={contracts?.total ?? 0}
          isLoading={isLoading}
        />
      )}

      {/* Stacked full-width rather than side by side: AI Insights now shows
          every category with a finding (not a fixed set of four), so its
          height varies with the portfolio - a fixed-height neighbor card
          next to it either traps blank space or gets cramped. Full width
          also gives its own row-list room to wrap into columns instead of
          one long single-file list. */}
      <AiInsightsPanel />

      <RecentContracts contracts={contracts?.recent} isLoading={isLoading} />

      <ActivityFeed />
    </div>
  );
}
