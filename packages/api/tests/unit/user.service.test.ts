const mockUser = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockUser)),
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockUser,
  isAssignableRole: (role: string) => role === "ADMIN" || role === "INTERNAL",
}));

import { userService } from "../../src/services/user.service";

const actor = { id: "actor-1", organizationId: "org-1" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("UserService.listUsers", () => {
  it("returns paginated users for the organization", async () => {
    mockUser.user.findMany.mockResolvedValue([
      { id: "u1", organizationId: "org-1", role: "ADMIN", status: "ACTIVE" },
    ]);
    mockUser.user.count.mockResolvedValue(1);

    const result = await userService.listUsers("org-1", { page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(mockUser.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    );
  });
});

describe("UserService.updateRole", () => {
  it("rejects assigning OWNER", async () => {
    await expect(
      userService.updateRole(actor, "target-1", "OWNER" as never),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockUser.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects changing your own role", async () => {
    mockUser.user.findFirst.mockResolvedValue({
      id: "actor-1",
      role: "INTERNAL",
    });

    await expect(
      userService.updateRole(actor, "actor-1", "ADMIN"),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("rejects changing the OWNER's role", async () => {
    mockUser.user.findFirst.mockResolvedValue({
      id: "target-1",
      role: "OWNER",
    });

    await expect(
      userService.updateRole(actor, "target-1", "ADMIN"),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("throws 404 when the target isn't in the organization", async () => {
    mockUser.user.findFirst.mockResolvedValue(null);

    await expect(
      userService.updateRole(actor, "missing-1", "ADMIN"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updates the role and writes an audit log entry", async () => {
    mockUser.user.findFirst.mockResolvedValue({
      id: "target-1",
      role: "INTERNAL",
    });
    mockUser.user.update.mockResolvedValue({
      id: "target-1",
      role: "ADMIN",
      status: "ACTIVE",
    });

    const result = await userService.updateRole(actor, "target-1", "ADMIN");

    expect(result.role).toBe("ADMIN");
    expect(mockUser.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "USER_ROLE_CHANGED",
          actorUserId: "actor-1",
          targetEntityId: "target-1",
        }),
      }),
    );
  });
});

describe("UserService.updateStatus", () => {
  it("rejects changing your own status", async () => {
    mockUser.user.findFirst.mockResolvedValue({
      id: "actor-1",
      role: "INTERNAL",
    });

    await expect(
      userService.updateStatus(actor, "actor-1", "SUSPENDED"),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("rejects changing the OWNER's status", async () => {
    mockUser.user.findFirst.mockResolvedValue({
      id: "target-1",
      role: "OWNER",
    });

    await expect(
      userService.updateStatus(actor, "target-1", "SUSPENDED"),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("logs USER_SUSPENDED when disabling", async () => {
    mockUser.user.findFirst.mockResolvedValue({
      id: "target-1",
      role: "INTERNAL",
      status: "ACTIVE",
    });
    mockUser.user.update.mockResolvedValue({
      id: "target-1",
      role: "INTERNAL",
      status: "SUSPENDED",
    });

    await userService.updateStatus(actor, "target-1", "SUSPENDED");

    expect(mockUser.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_SUSPENDED" }),
      }),
    );
  });

  it("logs USER_REACTIVATED when re-enabling", async () => {
    mockUser.user.findFirst.mockResolvedValue({
      id: "target-1",
      role: "INTERNAL",
      status: "SUSPENDED",
    });
    mockUser.user.update.mockResolvedValue({
      id: "target-1",
      role: "INTERNAL",
      status: "ACTIVE",
    });

    await userService.updateStatus(actor, "target-1", "ACTIVE");

    expect(mockUser.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_REACTIVATED" }),
      }),
    );
  });
});
