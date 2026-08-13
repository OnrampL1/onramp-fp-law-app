const mockDashboardRepository = {
  getSummaryRows: jest.fn(),
};

jest.mock("../../src/repositories/dashboard.repository", () => ({
  dashboardRepository: mockDashboardRepository,
}));

import { dashboardService } from "../../src/services/dashboard.service";

const updatedAt = new Date("2026-08-13T10:15:00.000Z");
const expirationDate = new Date("2026-08-26T00:00:00.000Z");

beforeEach(() => {
  jest.clearAllMocks();

  mockDashboardRepository.getSummaryRows.mockResolvedValue({
    total: 2,
    legalStateCounts: [
      { legalState: "ACTIVE", count: 1 },
      { legalState: null, count: 1 },
    ],
    businessStatusCounts: [{ businessStatus: "UNDER_REVIEW", count: 2 }],
    expiringSoonCount: 1,
    recentContracts: [
      {
        id: "contract-1",
        title: "Vendor Services Agreement",
        counterparty: "Coral Bay Hospitality Group",
        businessStatus: "UNDER_REVIEW",
        legalState: "ACTIVE",
        effectiveDate: null,
        expirationDate,
        updatedAt,
      },
    ],
    expiringContracts: [
      {
        id: "contract-1",
        title: "Vendor Services Agreement",
        counterparty: "Coral Bay Hospitality Group",
        businessStatus: "UNDER_REVIEW",
        legalState: "ACTIVE",
        effectiveDate: null,
        expirationDate,
        updatedAt,
      },
    ],
  });
});

describe("dashboardService.getSummary", () => {
  it("returns normalized dashboard summary data", async () => {
    const result = await dashboardService.getSummary("org-1");

    expect(mockDashboardRepository.getSummaryRows).toHaveBeenCalledWith(
      "org-1",
    );

    expect(result).toEqual({
      contracts: {
        total: 2,
        legalStateCounts: {
          DRAFT: 0,
          ACTIVE: 1,
          EXPIRED: 0,
          TERMINATED: 0,
          UNSET: 1,
        },
        businessStatusCounts: {
          DRAFT: 0,
          UNDER_REVIEW: 2,
          COMPLETED: 0,
          ARCHIVED: 0,
        },
        expiringSoonCount: 1,
        recent: [
          {
            id: "contract-1",
            title: "Vendor Services Agreement",
            counterparty: "Coral Bay Hospitality Group",
            businessStatus: "UNDER_REVIEW",
            legalState: "ACTIVE",
            effectiveDate: null,
            expirationDate: "2026-08-26",
            updatedAt: "2026-08-13T10:15:00.000Z",
          },
        ],
        expiringSoon: [
          {
            id: "contract-1",
            title: "Vendor Services Agreement",
            counterparty: "Coral Bay Hospitality Group",
            businessStatus: "UNDER_REVIEW",
            legalState: "ACTIVE",
            effectiveDate: null,
            expirationDate: "2026-08-26",
            updatedAt: "2026-08-13T10:15:00.000Z",
          },
        ],
      },
    });
  });
});
