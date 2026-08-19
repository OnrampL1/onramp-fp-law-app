import { apiClient } from "@/lib/api-client";
import type { DashboardSummary } from "@/types/dashboard";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response =
    await apiClient.get<ApiEnvelope<DashboardSummary>>("/dashboard/summary");

  return response.data.data;
}
