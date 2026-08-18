const mockDb = {
  organizationAccessRequest: {
    findUnique: jest.fn(),
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

    expect(result.outcome).toBe("CREATED");
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

    expect(result.outcome).toBe("UPDATED");
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

    expect(result.outcome).toBe("RESUBMITTED");
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

    expect(result.outcome).toBe("APPROVED_NOOP");
    expect(mockDb.organizationAccessRequest.create).not.toHaveBeenCalled();
    expect(mockDb.organizationAccessRequest.update).not.toHaveBeenCalled();
  });
});
