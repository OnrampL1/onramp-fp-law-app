const mockDb = {
  organizationAccessRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: typeof mockDb) => unknown) =>
    cb(mockDb),
  ),
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
}));

import { accessRequestService } from "../../src/services/access-request.service";

const baseInput = {
  contactFirstName: "Alex",
  contactLastName: "Morgan",
  contactEmail: "alex@example.com",
  organizationName: "Acme Legal Ops",
  websiteUrl: "https://acme.example",
  companySize: "ELEVEN_TO_FIFTY" as const,
  country: "Lebanon",
  intendedUse: "We want to manage legal contracts in one secure workspace.",
  notes: "Mostly vendor agreements.",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AccessRequestService.submitAccessRequest", () => {
  it("creates a pending request for a new email", async () => {
    mockDb.organizationAccessRequest.findUnique.mockResolvedValue(null);

    const result = await accessRequestService.submitAccessRequest(baseInput);

    expect(result).toEqual({
      message:
        "If eligible, your access request has been submitted for review.",
    });
    expect(mockDb.organizationAccessRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contactEmail: "alex@example.com",
        status: "PENDING",
        organizationName: "Acme Legal Ops",
      }),
    });
  });

  it("updates the existing row when the email already has a pending request", async () => {
    mockDb.organizationAccessRequest.findUnique.mockResolvedValue({
      id: "request-1",
      status: "PENDING",
    });

    const result = await accessRequestService.submitAccessRequest({
      ...baseInput,
      organizationName: "Acme Legal Operations",
    });

    expect(result).toEqual({
      message:
        "If eligible, your access request has been submitted for review.",
    });
    expect(mockDb.organizationAccessRequest.create).not.toHaveBeenCalled();
    expect(mockDb.organizationAccessRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: expect.objectContaining({
        organizationName: "Acme Legal Operations",
      }),
    });
  });

  it("resubmits a declined request and clears stale review fields", async () => {
    mockDb.organizationAccessRequest.findUnique.mockResolvedValue({
      id: "request-1",
      status: "DECLINED",
      reviewedAt: new Date("2026-01-01"),
      reviewedByPlatformUserId: "platform-1",
      declineReason: "Not enough information",
    });

    const result = await accessRequestService.submitAccessRequest(baseInput);

    expect(result).toEqual({
      message:
        "If eligible, your access request has been submitted for review.",
    });
    expect(mockDb.organizationAccessRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: expect.objectContaining({
        status: "PENDING",
        reviewedAt: null,
        reviewedByPlatformUserId: null,
        declineReason: null,
      }),
    });
  });

  it("does not create or update a row when the email already has an approved request", async () => {
    mockDb.organizationAccessRequest.findUnique.mockResolvedValue({
      id: "request-1",
      status: "APPROVED",
      organizationId: "org-1",
    });

    const result = await accessRequestService.submitAccessRequest(baseInput);

    expect(result).toEqual({
      message:
        "If eligible, your access request has been submitted for review.",
    });
    expect(mockDb.organizationAccessRequest.create).not.toHaveBeenCalled();
    expect(mockDb.organizationAccessRequest.update).not.toHaveBeenCalled();
  });
});

describe("AccessRequestService.listAccessRequests", () => {
  it("lists access requests with pagination", async () => {
    mockDb.organizationAccessRequest.findMany.mockResolvedValue([
      {
        id: "request-1",
        contactFirstName: "Alex",
        contactLastName: "Morgan",
        contactEmail: "alex@example.com",
        organizationName: "Acme Legal Ops",
        websiteUrl: null,
        companySize: null,
        country: null,
        intendedUse:
          "We want to manage legal contracts in one secure workspace.",
        notes: null,
        status: "PENDING",
        reviewedAt: null,
        declineReason: null,
        reviewedByPlatformUser: null,
        organization: null,
        createdAt: new Date("2026-08-18T00:00:00.000Z"),
        updatedAt: new Date("2026-08-18T00:00:00.000Z"),
      },
    ]);
    mockDb.organizationAccessRequest.count.mockResolvedValue(1);

    const result = await accessRequestService.listAccessRequests({
      page: 1,
      limit: 20,
    });

    expect(result.pagination.total).toBe(1);
    expect(result.data[0]).toMatchObject({
      id: "request-1",
      contactEmail: "alex@example.com",
      status: "PENDING",
      createdAt: "2026-08-18T00:00:00.000Z",
    });
    expect(mockDb.organizationAccessRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      }),
    );
  });

  it("applies status and search filters", async () => {
    mockDb.organizationAccessRequest.findMany.mockResolvedValue([]);
    mockDb.organizationAccessRequest.count.mockResolvedValue(0);

    await accessRequestService.listAccessRequests({
      page: 2,
      limit: 10,
      status: "PENDING",
      search: "acme",
    });

    expect(mockDb.organizationAccessRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
      }),
    );
  });
});

describe("AccessRequestService.getAccessRequest", () => {
  it("returns one access request by id", async () => {
    mockDb.organizationAccessRequest.findUnique.mockResolvedValue({
      id: "request-1",
      contactFirstName: "Alex",
      contactLastName: "Morgan",
      contactEmail: "alex@example.com",
      organizationName: "Acme Legal Ops",
      websiteUrl: null,
      companySize: null,
      country: null,
      intendedUse: "We want to manage legal contracts in one secure workspace.",
      notes: null,
      status: "PENDING",
      reviewedAt: null,
      declineReason: null,
      reviewedByPlatformUser: null,
      organization: null,
      createdAt: new Date("2026-08-18T00:00:00.000Z"),
      updatedAt: new Date("2026-08-18T00:00:00.000Z"),
    });

    const result = await accessRequestService.getAccessRequest("request-1");

    expect(result.id).toBe("request-1");
    expect(mockDb.organizationAccessRequest.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "request-1" },
      }),
    );
  });

  it("throws 404 when access request is missing", async () => {
    mockDb.organizationAccessRequest.findUnique.mockResolvedValue(null);

    await expect(
      accessRequestService.getAccessRequest("missing-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
