const mockDb = {
  user: {
    findUnique: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
  },
  invitation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
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

    // A newly created invitation remains PENDING (Prisma's InvitationStatus
    // default) — it is never created as anything else.
    expect(result.status).toBe("PENDING");
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

  it("includes the inviter's name and organization name in the email variables", async () => {
    mockDb.user.findUnique
      .mockResolvedValueOnce(null) // existingUser duplicate-check
      .mockResolvedValueOnce({ fullName: "Marcus Chen" }); // inviter lookup
    mockDb.organization.findUnique.mockResolvedValue({
      name: "Ridgeline & Voss LLP",
    });
    mockDb.invitation.findFirst.mockResolvedValue(null);
    mockDb.invitation.create.mockResolvedValue({
      id: "inv-2",
      email: "new@example.com",
      role: "INTERNAL",
      status: "PENDING",
      expiresAt: new Date("2026-01-08"),
      createdAt: new Date("2026-01-01"),
    });

    await invitationService.createInvitation(actor, {
      email: "new@example.com",
      fullName: "Jordan Lee",
      role: "INTERNAL",
    });

    expect(mockEmailQueue.add).toHaveBeenCalledWith(
      "invitation",
      expect.objectContaining({
        variables: expect.objectContaining({
          inviterName: "Marcus Chen",
          organizationName: "Ridgeline & Voss LLP",
        }),
      }),
    );
  });
});

describe("InvitationService.listInvitations", () => {
  it("lists PENDING and EXPIRED invitations for the organization", async () => {
    mockDb.invitation.findMany.mockResolvedValue([]);
    mockDb.invitation.count.mockResolvedValue(0);

    await invitationService.listInvitations("org-1", { page: 1, limit: 20 });

    expect(mockDb.invitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          status: { in: ["PENDING", "EXPIRED"] },
        },
      }),
    );
  });

  it("excludes ACCEPTED and REVOKED invitations", async () => {
    mockDb.invitation.findMany.mockResolvedValue([]);
    mockDb.invitation.count.mockResolvedValue(0);

    await invitationService.listInvitations("org-1", { page: 1, limit: 20 });

    const call = mockDb.invitation.findMany.mock.calls[0][0];
    expect(call.where.status.in).not.toContain("ACCEPTED");
    expect(call.where.status.in).not.toContain("REVOKED");
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

describe("InvitationService.revokeInvitation", () => {
  it("throws 404 when the invitation isn't found", async () => {
    mockDb.invitation.findFirst.mockResolvedValue(null);

    await expect(
      invitationService.revokeInvitation(actor, "missing-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it.each(["ACCEPTED", "EXPIRED", "REVOKED"])(
    "rejects revoking a %s invitation — only PENDING can be revoked",
    async (status) => {
      mockDb.invitation.findFirst.mockResolvedValue({ id: "inv-1", status });

      await expect(
        invitationService.revokeInvitation(actor, "inv-1"),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockDb.invitation.update).not.toHaveBeenCalled();
    },
  );

  it("revokes a pending invitation and logs an audit entry", async () => {
    mockDb.invitation.findFirst.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
    });
    mockDb.invitation.update.mockResolvedValue({
      id: "inv-1",
      email: "invitee@example.com",
      role: "INTERNAL",
      status: "REVOKED",
      expiresAt: new Date("2026-01-08"),
      createdAt: new Date("2026-01-01"),
    });

    const result = await invitationService.revokeInvitation(actor, "inv-1");

    expect(result.status).toBe("REVOKED");
    expect(mockDb.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({
          status: "REVOKED",
          revokedByUserId: actor.id,
        }),
      }),
    );
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "INVITATION_REVOKED",
          actorUserId: actor.id,
          targetEntityType: "Invitation",
          targetEntityId: "inv-1",
        }),
      }),
    );
  });
});

describe("InvitationService.expireStaleInvitations", () => {
  it("flips only PENDING invitations whose expiresAt has passed", async () => {
    mockDb.invitation.updateMany.mockResolvedValue({ count: 3 });

    const count = await invitationService.expireStaleInvitations();

    expect(count).toBe(3);
    expect(mockDb.invitation.updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", expiresAt: { lt: expect.any(Date) } },
      data: { status: "EXPIRED" },
    });
  });

  it("returns 0 when nothing is stale", async () => {
    mockDb.invitation.updateMany.mockResolvedValue({ count: 0 });

    const count = await invitationService.expireStaleInvitations();

    expect(count).toBe(0);
  });
});
