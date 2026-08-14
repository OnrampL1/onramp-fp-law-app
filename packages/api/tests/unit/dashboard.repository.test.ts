const mockPrisma = {
  contract: {
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockPrisma,
}));

import {
  DASHBOARD_CONTRACT_SELECT,
  dashboardRepository,
} from "../../src/repositories/dashboard.repository";

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-08-13T12:00:00.000Z"));

  mockPrisma.contract.count.mockResolvedValueOnce(9).mockResolvedValueOnce(1);

  mockPrisma.contract.groupBy
    .mockResolvedValueOnce([
      { legalState: "ACTIVE", _count: { _all: 5 } },
      { legalState: "DRAFT", _count: { _all: 2 } },
    ])
    .mockResolvedValueOnce([
      { businessStatus: "COMPLETED", _count: { _all: 3 } },
      { businessStatus: "UNDER_REVIEW", _count: { _all: 3 } },
    ]);

  mockPrisma.contract.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("dashboardRepository.getSummaryRows", () => {
  it("aggregates only non-deleted contracts in the requested organization", async () => {
    await dashboardRepository.getSummaryRows("org-1");

    expect(mockPrisma.contract.count).toHaveBeenNthCalledWith(1, {
      where: {
        organizationId: "org-1",
        deletedAt: null,
      },
    });

    expect(mockPrisma.contract.groupBy).toHaveBeenNthCalledWith(1, {
      by: ["legalState"],
      where: {
        organizationId: "org-1",
        deletedAt: null,
      },
      _count: { _all: true },
    });

    expect(mockPrisma.contract.groupBy).toHaveBeenNthCalledWith(2, {
      by: ["businessStatus"],
      where: {
        organizationId: "org-1",
        deletedAt: null,
      },
      _count: { _all: true },
    });
  });

  it("counts expiring contracts in the next 30 days and excludes archived contracts", async () => {
    await dashboardRepository.getSummaryRows("org-1");

    expect(mockPrisma.contract.count).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: "org-1",
        deletedAt: null,
        businessStatus: { not: "ARCHIVED" },
        expirationDate: {
          gte: new Date("2026-08-13T00:00:00.000Z"),
          lte: new Date("2026-09-12T00:00:00.000Z"),
        },
      },
    });
  });

  it("loads recent and expiring contract rows with the dashboard-safe select", async () => {
    await dashboardRepository.getSummaryRows("org-1");

    expect(mockPrisma.contract.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        organizationId: "org-1",
        deletedAt: null,
      },
      select: DASHBOARD_CONTRACT_SELECT,
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    expect(mockPrisma.contract.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: "org-1",
        deletedAt: null,
        businessStatus: { not: "ARCHIVED" },
        expirationDate: {
          gte: new Date("2026-08-13T00:00:00.000Z"),
          lte: new Date("2026-09-12T00:00:00.000Z"),
        },
      },
      select: DASHBOARD_CONTRACT_SELECT,
      orderBy: { expirationDate: "asc" },
      take: 5,
    });
  });

  it("maps Prisma groupBy rows into simple count rows", async () => {
    const result = await dashboardRepository.getSummaryRows("org-1");

    expect(result).toEqual({
      total: 9,
      legalStateCounts: [
        { legalState: "ACTIVE", count: 5 },
        { legalState: "DRAFT", count: 2 },
      ],
      businessStatusCounts: [
        { businessStatus: "COMPLETED", count: 3 },
        { businessStatus: "UNDER_REVIEW", count: 3 },
      ],
      expiringSoonCount: 1,
      recentContracts: [],
      expiringContracts: [],
    });
  });
});
