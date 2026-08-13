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

  const kpiItems: KpiCardItem[] = [
    {
      icon: <FileText className="size-5" />,
      value: formatCount(contracts?.total, isLoading),
      label: "Total Contracts",
      sublabel: "Organization portfolio",
    },
    {
      icon: <FileCheck2 className="size-5" />,
      value: formatCount(contracts?.legalStateCounts.ACTIVE, isLoading),
      label: "Active Contracts",
      sublabel:
        contracts && contracts.total > 0
          ? `${((contracts.legalStateCounts.ACTIVE / contracts.total) * 100).toFixed(1)}% of portfolio`
          : "Legal state: active",
    },
    {
      icon: <CalendarClock className="size-5" />,
      value: formatCount(contracts?.expiringSoonCount, isLoading),
      label: "Expiring Soon",
      sublabel: "Within 30 days",
    },
    {
      icon: <ClipboardList className="size-5" />,
      value: formatCount(
        contracts?.businessStatusCounts.UNDER_REVIEW,
        isLoading,
      ),
      label: "Under Review",
      sublabel: "Business workflow status",
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ContractStatusOverview
            counts={contracts?.legalStateCounts}
            total={contracts?.total ?? 0}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-2">
          <AiInsightsPanel />
        </div>
      </div>

      <RecentContracts contracts={contracts?.recent} isLoading={isLoading} />

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
