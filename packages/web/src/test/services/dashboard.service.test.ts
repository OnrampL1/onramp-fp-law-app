import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchDashboardSummary } from "@/services/dashboard.service";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
};

describe("fetchDashboardSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches dashboard summary from the backend", async () => {
    const summary = {
      contracts: {
        total: 9,
        legalStateCounts: {
          DRAFT: 2,
          ACTIVE: 5,
          EXPIRED: 1,
          TERMINATED: 1,
          UNSET: 0,
        },
        businessStatusCounts: {
          DRAFT: 2,
          UNDER_REVIEW: 3,
          COMPLETED: 3,
          ARCHIVED: 1,
        },
        expiringSoonCount: 1,
        recent: [],
        expiringSoon: [],
      },
    };

    mockApiClient.get.mockResolvedValue({ data: { data: summary } });

    await expect(fetchDashboardSummary()).resolves.toEqual(summary);

    expect(mockApiClient.get).toHaveBeenCalledWith("/dashboard/summary");
  });
});
