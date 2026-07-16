const mockDb = {
  user: {
    findUnique: jest.fn(),
  },
  invitation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
};

const mockEmailQueue = { add: jest.fn() };

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
  hashToken: (raw: string) => `hashed-${raw}`,
  generateRawToken: () => "raw-token",
  emailQueue: mockEmailQueue,
}));

import { invitationService } from "../../src/services/invitation.service";

const actor = { id: "actor-1", organizationId: "org-1" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("InvitationService.createInvitation", () => {
  it("rejects when a user already exists for the email", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "existing-1" });
    mockDb.invitation.findFirst.mockResolvedValue(null);

    await expect(
      invitationService.createInvitation(actor, {
        email: "taken@example.com",
        fullName: "Jordan Lee",
        role: "INTERNAL",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects when a pending invitation already exists for the email", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.invitation.findFirst.mockResolvedValue({ id: "inv-1" });

    await expect(
      invitationService.createInvitation(actor, {
        email: "pending@example.com",
        fullName: "Jordan Lee",
        role: "INTERNAL",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("creates the invitation, logs it, and emails the accept link", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.invitation.findFirst.mockResolvedValue(null);
    mockDb.invitation.create.mockResolvedValue({
      id: "inv-1",
      email: "new@example.com",
      role: "INTERNAL",
      status: "PENDING",
      expiresAt: new Date("2026-01-08"),
      createdAt: new Date("2026-01-01"),
    });

    const result = await invitationService.createInvitation(actor, {
      email: "new@example.com",
      fullName: "Jordan Lee",
      role: "INTERNAL",
    });

    expect(result).not.toHaveProperty("token");
    expect(result).not.toHaveProperty("tokenHash");
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_INVITED" }),
      }),
    );
    expect(mockEmailQueue.add).toHaveBeenCalledWith(
      "invitation",
      expect.objectContaining({
        to: "new@example.com",
        variables: expect.objectContaining({
          acceptUrl: expect.stringContaining("raw-token"),
        }),
      }),
    );
  });
});

describe("InvitationService.listInvitations", () => {
  it("only lists PENDING invitations for the organization", async () => {
    mockDb.invitation.findMany.mockResolvedValue([]);
    mockDb.invitation.count.mockResolvedValue(0);

    await invitationService.listInvitations("org-1", { page: 1, limit: 20 });

    expect(mockDb.invitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", status: "PENDING" },
      }),
    );
  });
});

describe("InvitationService.resendInvitation", () => {
  it("throws 404 when the invitation isn't found", async () => {
    mockDb.invitation.findFirst.mockResolvedValue(null);

    await expect(
      invitationService.resendInvitation(actor, "missing-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects resending an already-accepted invitation", async () => {
    mockDb.invitation.findFirst.mockResolvedValue({
      id: "inv-1",
      status: "ACCEPTED",
    });

    await expect(
      invitationService.resendInvitation(actor, "inv-1"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects resending a revoked invitation", async () => {
    mockDb.invitation.findFirst.mockResolvedValue({
      id: "inv-1",
      status: "REVOKED",
    });

    await expect(
      invitationService.resendInvitation(actor, "inv-1"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rotates the token and re-sends the email for a pending invitation", async () => {
    mockDb.invitation.findFirst.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      email: "invitee@example.com",
    });
    mockDb.invitation.update.mockResolvedValue({
      id: "inv-1",
      email: "invitee@example.com",
      role: "INTERNAL",
      status: "PENDING",
      expiresAt: new Date("2026-01-15"),
      createdAt: new Date("2026-01-01"),
    });

    await invitationService.resendInvitation(actor, "inv-1");

    expect(mockDb.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenHash: "hashed-raw-token" }),
      }),
    );
    expect(mockEmailQueue.add).toHaveBeenCalled();
  });

  it("revives an expired invitation back to pending", async () => {
    mockDb.invitation.findFirst.mockResolvedValue({
      id: "inv-1",
      status: "EXPIRED",
      email: "invitee@example.com",
    });
    mockDb.invitation.update.mockResolvedValue({
      id: "inv-1",
      email: "invitee@example.com",
      role: "INTERNAL",
      status: "PENDING",
      expiresAt: new Date("2026-01-15"),
      createdAt: new Date("2026-01-01"),
    });

    const result = await invitationService.resendInvitation(actor, "inv-1");

    expect(result.status).toBe("PENDING");
  });
});
