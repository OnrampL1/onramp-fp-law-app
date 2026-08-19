import request from "supertest";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  getPrismaClient: jest.fn(() => mockPrisma),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/audit.service", () => ({
  auditService: {
    listAuditLogs: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { auditService } from "../../src/services/audit.service";

const mockAuditService = auditService as jest.Mocked<typeof auditService>;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL", orgId = "org-1") {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: orgId,
    role,
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
    },
  });

  const token = signAccessToken({ userId: "user-1", orgId, role });
  return `accessToken=${token}`;
}

const emptyResult = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

beforeEach(() => {
  jest.clearAllMocks();

  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role: "INTERNAL",
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
    },
  });
});

// ─── GET /api/organizations/:id/audit-logs ─────────────────────────────────────

describe("GET /api/organizations/:id/audit-logs", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/organizations/org-1/audit-logs");
    expect(res.status).toBe(401);
    expect(mockAuditService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("returns 403 for an INTERNAL caller — audit review is Owner/Admin only", async () => {
    const res = await request(app)
      .get("/api/organizations/org-1/audit-logs")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockAuditService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("returns 200 for an ADMIN caller", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    const res = await request(app)
      .get("/api/organizations/org-1/audit-logs")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { pagination: emptyResult.pagination } });
  });

  it("returns 200 for an OWNER caller", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    const res = await request(app)
      .get("/api/organizations/org-1/audit-logs")
      .set("Cookie", cookieFor("OWNER"));

    expect(res.status).toBe(200);
  });

  it("returns 404 when the org in the path doesn't match the caller's own org", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    const res = await request(app)
      .get("/api/organizations/some-other-org/audit-logs")
      .set("Cookie", cookieFor("ADMIN", "org-1"));

    expect(res.status).toBe(404);
    expect(mockAuditService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("defaults page/limit and passes the authenticated org, not the path param, to the service", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    await request(app)
      .get("/api/organizations/org-1/audit-logs")
      .set("Cookie", cookieFor("ADMIN", "org-1"));

    expect(mockAuditService.listAuditLogs).toHaveBeenCalledWith(
      "org-1",
      {
        contractId: undefined,
        actorUserId: undefined,
        action: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      },
      { page: 1, limit: 20 },
    );
  });

  it("forwards filters and pagination from the query string", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    const contractId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    const actorUserId = "3fa85f64-5717-4562-b3fc-2c963f66afa7";

    await request(app)
      .get("/api/organizations/org-1/audit-logs")
      .query({
        contractId,
        actorUserId,
        action: "USER_ROLE_CHANGED",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        page: "2",
        limit: "10",
      })
      .set("Cookie", cookieFor("ADMIN", "org-1"));

    expect(mockAuditService.listAuditLogs).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        contractId,
        actorUserId,
        action: "USER_ROLE_CHANGED",
        dateFrom: new Date("2026-01-01"),
        dateTo: new Date("2026-01-31"),
      }),
      { page: 2, limit: 10 },
    );
  });

  it("returns 422 for an unknown action value", async () => {
    const res = await request(app)
      .get("/api/organizations/org-1/audit-logs")
      .query({ action: "NOT_A_REAL_ACTION" })
      .set("Cookie", cookieFor("ADMIN", "org-1"));

    expect(res.status).toBe(422);
    expect(mockAuditService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("returns 422 for a non-uuid actorUserId", async () => {
    const res = await request(app)
      .get("/api/organizations/org-1/audit-logs")
      .query({ actorUserId: "not-a-uuid" })
      .set("Cookie", cookieFor("ADMIN", "org-1"));

    expect(res.status).toBe(422);
    expect(mockAuditService.listAuditLogs).not.toHaveBeenCalled();
  });
});

// ─── GET /api/contracts/:id/audit ───────────────────────────────────────────────

describe("GET /api/contracts/:id/audit", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/contracts/contract-1/audit");
    expect(res.status).toBe(401);
    expect(mockAuditService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("returns 403 for an INTERNAL caller", async () => {
    const res = await request(app)
      .get("/api/contracts/contract-1/audit")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockAuditService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("returns 200 for an ADMIN caller and pre-fills contractId from the path", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    const res = await request(app)
      .get("/api/contracts/contract-1/audit")
      .set("Cookie", cookieFor("ADMIN", "org-1"));

    expect(res.status).toBe(200);
    expect(mockAuditService.listAuditLogs).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ contractId: "contract-1" }),
      { page: 1, limit: 20 },
    );
  });

  it("returns 200 for an OWNER caller", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    const res = await request(app)
      .get("/api/contracts/contract-1/audit")
      .set("Cookie", cookieFor("OWNER", "org-1"));

    expect(res.status).toBe(200);
  });

  it("ignores a contractId in the query string in favor of the path param", async () => {
    mockAuditService.listAuditLogs.mockResolvedValue(emptyResult);

    await request(app)
      .get("/api/contracts/contract-1/audit")
      .query({ contractId: "some-other-contract" })
      .set("Cookie", cookieFor("ADMIN", "org-1"));

    expect(mockAuditService.listAuditLogs).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ contractId: "contract-1" }),
      { page: 1, limit: 20 },
    );
  });
});
