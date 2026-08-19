const mockDb = {
  organizationAccessRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  organization: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
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

describe("AccessRequestService review actions", () => {
  const pendingRequest = {
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
    reviewedByPlatformUserId: null,
    declineReason: null,
    organizationId: null,
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    updatedAt: new Date("2026-08-18T00:00:00.000Z"),
  };

  it("approves a pending request by creating and linking an organization", async () => {
    mockDb.organizationAccessRequest.findUnique
      .mockResolvedValueOnce(pendingRequest)
      .mockResolvedValueOnce({
        ...pendingRequest,
        status: "APPROVED",
        reviewedAt: new Date("2026-08-19T00:00:00.000Z"),
        reviewedByPlatformUserId: "platform-1",
        organizationId: "org-1",
        reviewedByPlatformUser: {
          id: "platform-1",
          email: "admin@clausio.test",
          fullName: "Platform Admin",
          role: "SUPER_ADMIN",
        },
        organization: {
          id: "org-1",
          name: "Acme Legal Ops",
          slug: "acme-legal-ops",
          status: "CREATED",
        },
      });

    mockDb.organization.create.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal Ops",
      slug: "acme-legal-ops",
      status: "CREATED",
      ownerAssignedAt: null,
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
      updatedAt: new Date("2026-08-19T00:00:00.000Z"),
      ownerUser: null,
      _count: {
        members: 0,
        invitations: 0,
        contracts: 0,
        auditLogs: 0,
      },
    });

    mockDb.organizationAccessRequest.updateMany.mockResolvedValue({ count: 1 });

    const result = await accessRequestService.approveAccessRequest(
      { id: "platform-1" },
      "request-1",
      {
        name: "Acme Legal Ops",
        slug: "acme-legal-ops",
        timezone: "UTC",
        language: "en",
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      },
    );

    expect(result.status).toBe("APPROVED");
    expect(result.organization?.id).toBe("org-1");
    expect(mockDb.organization.create).toHaveBeenCalled();
    expect(mockDb.organizationAccessRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: "request-1",
        status: "PENDING",
        organizationId: null,
      },
      data: expect.objectContaining({
        status: "APPROVED",
        reviewedByPlatformUserId: "platform-1",
        organizationId: "org-1",
        declineReason: null,
      }),
    });
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        actorType: "PLATFORM_USER",
        actorPlatformUserId: "platform-1",
        action: "ORGANIZATION_CREATED",
        targetEntityType: "Organization",
        targetEntityId: "org-1",
      }),
    });
  });

  it("does not approve a request that was already reviewed", async () => {
    mockDb.organizationAccessRequest.findUnique.mockResolvedValue({
      ...pendingRequest,
      status: "APPROVED",
      organizationId: "org-1",
    });

    await expect(
      accessRequestService.approveAccessRequest(
        { id: "platform-1" },
        "request-1",
        {
          name: "Acme Legal Ops",
          slug: "acme-legal-ops",
          timezone: "UTC",
          language: "en",
        },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockDb.organization.create).not.toHaveBeenCalled();
  });

  it("declines a pending request without creating an organization", async () => {
    mockDb.organizationAccessRequest.findUnique
      .mockResolvedValueOnce(pendingRequest)
      .mockResolvedValueOnce({
        ...pendingRequest,
        status: "DECLINED",
        reviewedAt: new Date("2026-08-19T00:00:00.000Z"),
        reviewedByPlatformUserId: "platform-1",
        declineReason: "Not a fit right now",
        reviewedByPlatformUser: {
          id: "platform-1",
          email: "admin@clausio.test",
          fullName: "Platform Admin",
          role: "SUPER_ADMIN",
        },
        organization: null,
      });

    mockDb.organizationAccessRequest.updateMany.mockResolvedValue({ count: 1 });

    const result = await accessRequestService.declineAccessRequest(
      { id: "platform-1" },
      "request-1",
      { declineReason: "Not a fit right now" },
    );

    expect(result.status).toBe("DECLINED");
    expect(result.declineReason).toBe("Not a fit right now");
    expect(mockDb.organization.create).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });
});
