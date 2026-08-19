import request from "supertest";

const mockWitnessDb = {
  witnessInvitation: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
  getPrismaClient: () => mockWitnessDb,
  verifyWitnessSessionToken: jest.fn(),
}));

jest.mock("../../src/services/witness.service", () => ({
  witnessService: {
    listWitnessLinks: jest.fn(),
    getWitnessLinkStats: jest.fn(),
    createWitnessLink: jest.fn(),
    redeemWitnessLink: jest.fn(),
    getWitnessScopedContract: jest.fn(),
    revokeWitnessLink: jest.fn(),
    resendWitnessLink: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken, verifyWitnessSessionToken } from "@starter-kit/shared";
import { witnessService } from "../../src/services/witness.service";

const mockWitnessService = witnessService as jest.Mocked<typeof witnessService>;
const mockVerifyWitnessSessionToken = verifyWitnessSessionToken as jest.Mock;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL") {
  mockWitnessDb.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role,
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
    },
  });

  const token = signAccessToken({ userId: "user-1", orgId: "org-1", role });
  return `accessToken=${token}`;
}

function validWitnessSessionCookie(witnessInvitationId = "witness-1") {
  mockVerifyWitnessSessionToken.mockReturnValue({
    witnessInvitationId,
    jti: "jti-1",
  });
  mockWitnessDb.witnessInvitation.findUnique.mockResolvedValue({
    id: witnessInvitationId,
    contractId: "contract-1",
    isRevoked: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return "witnessAccessToken=valid-session-jwt";
}

const validBody = {
  contractId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  witnessEmail: "witness@example.com",
};

beforeEach(() => {
  jest.clearAllMocks();

  mockWitnessDb.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role: "INTERNAL",
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
    },
  });
});

// ─── GET /api/users/witness-link ───────────────────────────────────────────────

describe("GET /api/users/witness-link", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/users/witness-link");
    expect(res.status).toBe(401);
  });

  it("returns 403 for an INTERNAL caller — listing witness links is Admin/Owner-only", async () => {
    const res = await request(app)
      .get("/api/users/witness-link")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockWitnessService.listWitnessLinks).not.toHaveBeenCalled();
  });

  it("returns 200 with the paginated list for an ADMIN caller", async () => {
    mockWitnessService.listWitnessLinks.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    } as never);

    const res = await request(app)
      .get("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(mockWitnessService.listWitnessLinks).toHaveBeenCalledWith(
      "org-1",
      { contractId: undefined },
      { page: 1, limit: 20 },
    );
  });

  it("passes contractId through when provided as a query param", async () => {
    mockWitnessService.listWitnessLinks.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    } as never);

    await request(app)
      .get("/api/users/witness-link")
      .query({ contractId: "3fa85f64-5717-4562-b3fc-2c963f66afa6" })
      .set("Cookie", cookieFor("ADMIN"));

    expect(mockWitnessService.listWitnessLinks).toHaveBeenCalledWith(
      "org-1",
      { contractId: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
      { page: 1, limit: 20 },
    );
  });

  it("returns 422 for a non-UUID contractId", async () => {
    const res = await request(app)
      .get("/api/users/witness-link")
      .query({ contractId: "not-a-uuid" })
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(422);
    expect(mockWitnessService.listWitnessLinks).not.toHaveBeenCalled();
  });
});

// ─── GET /api/users/witness-link/stats ─────────────────────────────────────────

describe("GET /api/users/witness-link/stats", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/users/witness-link/stats");
    expect(res.status).toBe(401);
  });

  it("returns 403 for an INTERNAL caller", async () => {
    const res = await request(app)
      .get("/api/users/witness-link/stats")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockWitnessService.getWitnessLinkStats).not.toHaveBeenCalled();
  });

  it("returns 200 with the org's real stats for an ADMIN caller", async () => {
    const stats = {
      total: 50,
      totalNewLast7Days: 5,
      active: 39,
      pending: 9,
      used: 30,
      usedThisMonth: 12,
      usedLast7Days: 4,
      expired: 8,
      expiredNewLast7Days: 2,
      revoked: 3,
    };
    mockWitnessService.getWitnessLinkStats.mockResolvedValue(stats as never);

    const res = await request(app)
      .get("/api/users/witness-link/stats")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(stats);
    expect(mockWitnessService.getWitnessLinkStats).toHaveBeenCalledWith("org-1");
  });
});

// ─── POST /api/users/witness-link ──────────────────────────────────────────────

describe("POST /api/users/witness-link", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).post("/api/users/witness-link").send(validBody);
    expect(res.status).toBe(401);
  });

  it("returns 403 for an INTERNAL caller — only Admin/Owner can generate witness links", async () => {
    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("INTERNAL"))
      .send(validBody);

    expect(res.status).toBe(403);
    expect(mockWitnessService.createWitnessLink).not.toHaveBeenCalled();
  });

  it("returns 201 for an ADMIN caller", async () => {
    mockWitnessService.createWitnessLink.mockResolvedValue({
      id: "witness-1",
      contractId: validBody.contractId,
      token: "raw-token",
      witnessUrl: "http://localhost:5173/witness/raw-token",
      witnessEmail: validBody.witnessEmail,
      witnessName: null,
      status: "pending",
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    } as never);

    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBe("raw-token");
    expect(mockWitnessService.createWitnessLink).toHaveBeenCalledWith(
      { id: "user-1", organizationId: "org-1" },
      expect.objectContaining(validBody),
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
  });

  it("returns 201 for an OWNER caller", async () => {
    mockWitnessService.createWitnessLink.mockResolvedValue({
      id: "witness-1",
      contractId: validBody.contractId,
      token: "raw-token",
      witnessUrl: "http://localhost:5173/witness/raw-token",
      witnessEmail: validBody.witnessEmail,
      witnessName: null,
      status: "pending",
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    } as never);

    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("OWNER"))
      .send(validBody);

    expect(res.status).toBe(201);
  });

  it("returns 422 when contractId is missing", async () => {
    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ witnessEmail: "witness@example.com" });

    expect(res.status).toBe(422);
    expect(mockWitnessService.createWitnessLink).not.toHaveBeenCalled();
  });

  it("returns 422 when contractId is not a UUID", async () => {
    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ contractId: "not-a-uuid", witnessEmail: "witness@example.com" });

    expect(res.status).toBe(422);
  });

  it("returns 422 when witnessEmail is missing", async () => {
    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ contractId: validBody.contractId });

    expect(res.status).toBe(422);
  });

  it("returns 422 when witnessEmail is not a valid email", async () => {
    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ contractId: validBody.contractId, witnessEmail: "not-an-email" });

    expect(res.status).toBe(422);
  });

  it("returns 422 when expiresInHours is out of range", async () => {
    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ ...validBody, expiresInHours: 1000 });

    expect(res.status).toBe(422);
    expect(mockWitnessService.createWitnessLink).not.toHaveBeenCalled();
  });

  it("defaults expiresInHours to 72 when omitted", async () => {
    mockWitnessService.createWitnessLink.mockResolvedValue({
      id: "witness-1",
      contractId: validBody.contractId,
      token: "raw-token",
      witnessUrl: "http://localhost:5173/witness/raw-token",
      witnessEmail: validBody.witnessEmail,
      witnessName: null,
      status: "pending",
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    } as never);

    await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send(validBody);

    expect(mockWitnessService.createWitnessLink).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ expiresInHours: 72 }),
      expect.anything(),
    );
  });

  it("propagates a 404 from the service when the contract isn't found in the actor's org", async () => {
    const err = new Error("Contract not found") as Error & { statusCode: number };
    err.statusCode = 404;
    mockWitnessService.createWitnessLink.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/users/witness-link")
      .set("Cookie", cookieFor("ADMIN"))
      .send(validBody);

    expect(res.status).toBe(404);
  });
});

// ─── POST /api/auth/witness/:token ─────────────────────────────────────────────

const mockRedeemWitnessLink = witnessService.redeemWitnessLink as jest.Mock;

describe("POST /api/auth/witness/:token", () => {
  it("is public — no session cookie required", async () => {
    mockRedeemWitnessLink.mockResolvedValue({
      sessionToken: "session-token",
      contract: { id: "contract-1", title: "MSA" },
      witnessToken: { id: "witness-1", status: "used", token: null },
    });

    const res = await request(app).post("/api/auth/witness/some-raw-token");

    expect(res.status).toBe(200);
    expect(mockRedeemWitnessLink).toHaveBeenCalledWith(
      "some-raw-token",
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
  });

  it("sets an HttpOnly witnessAccessToken cookie scoped to /api on success", async () => {
    mockRedeemWitnessLink.mockResolvedValue({
      sessionToken: "session-token-value",
      contract: { id: "contract-1", title: "MSA" },
      witnessToken: { id: "witness-1", status: "used", token: null },
    });

    const res = await request(app).post("/api/auth/witness/some-raw-token");

    const setCookie = res.headers["set-cookie"] as unknown as string[];
    const witnessCookie = setCookie.find((c) => c.startsWith("witnessAccessToken="));
    expect(witnessCookie).toBeDefined();
    expect(witnessCookie).toContain("session-token-value");
    expect(witnessCookie).toContain("HttpOnly");
    expect(witnessCookie).toContain("Path=/api");
  });

  it("returns the contract preview and witness token in the response body", async () => {
    mockRedeemWitnessLink.mockResolvedValue({
      sessionToken: "session-token",
      contract: { id: "contract-1", title: "MSA" },
      witnessToken: { id: "witness-1", status: "used", token: null },
    });

    const res = await request(app).post("/api/auth/witness/some-raw-token");

    expect(res.body.data.contract).toEqual({ id: "contract-1", title: "MSA" });
    expect(res.body.data.witnessToken.status).toBe("used");
  });

  it("returns 404 when the token doesn't resolve to any invitation", async () => {
    const err = new Error("Witness link not found") as Error & { statusCode: number };
    err.statusCode = 404;
    mockRedeemWitnessLink.mockRejectedValue(err);

    const res = await request(app).post("/api/auth/witness/unknown-token");

    expect(res.status).toBe(404);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it.each([
    ["revoked", "This witness link has been revoked"],
    ["expired", "This witness link has expired"],
    ["already used", "This witness link has already been used"],
  ])("returns 410 when the link is %s", async (_label, message) => {
    const err = new Error(message) as Error & { statusCode: number };
    err.statusCode = 410;
    mockRedeemWitnessLink.mockRejectedValue(err);

    const res = await request(app).post("/api/auth/witness/dead-token");

    expect(res.status).toBe(410);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

// ─── GET /api/witness/contract ──────────────────────────────────────────────────

describe("GET /api/witness/contract", () => {
  it("returns 401 with no witness session cookie", async () => {
    const res = await request(app).get("/api/witness/contract");

    expect(res.status).toBe(401);
    expect(mockWitnessService.getWitnessScopedContract).not.toHaveBeenCalled();
  });

  it("returns 401 when the session token fails verification", async () => {
    mockVerifyWitnessSessionToken.mockImplementation(() => {
      throw new Error("jwt malformed");
    });

    const res = await request(app)
      .get("/api/witness/contract")
      .set("Cookie", "witnessAccessToken=garbage");

    expect(res.status).toBe(401);
    expect(mockWitnessService.getWitnessScopedContract).not.toHaveBeenCalled();
  });

  it("returns 403 when the underlying invitation has been revoked", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockWitnessDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app)
      .get("/api/witness/contract")
      .set("Cookie", "witnessAccessToken=valid-session-jwt");

    expect(res.status).toBe(403);
    expect(mockWitnessService.getWitnessScopedContract).not.toHaveBeenCalled();
  });

  it("returns 403 when the underlying invitation has expired", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockWitnessDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: false,
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .get("/api/witness/contract")
      .set("Cookie", "witnessAccessToken=valid-session-jwt");

    expect(res.status).toBe(403);
    expect(mockWitnessService.getWitnessScopedContract).not.toHaveBeenCalled();
  });

  it("returns the scoped contract for a valid session, using the session's contractId", async () => {
    const cookie = validWitnessSessionCookie();
    mockWitnessService.getWitnessScopedContract.mockResolvedValue({
      id: "contract-1",
      title: "Master Services Agreement",
      counterparty: "Acme Corp",
      businessStatus: "UNDER_REVIEW",
      legalState: null,
      tags: [],
      effectiveDate: null,
      expirationDate: null,
      processingStatus: "EXTRACTION_COMPLETED",
      processingError: null,
      extractedText: "Full contract text...",
      fileUrl: "https://s3.example.com/signed-url",
      fileUrlExpiresInSeconds: 900,
    } as never);

    const res = await request(app)
      .get("/api/witness/contract")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(mockWitnessService.getWitnessScopedContract).toHaveBeenCalledWith(
      "contract-1",
    );
    expect(res.body.data.title).toBe("Master Services Agreement");
    expect(res.body.data.fileUrl).toBe("https://s3.example.com/signed-url");
    expect(res.body.data.processingStatus).toBe("EXTRACTION_COMPLETED");
  });

  it("never returns notes or AI analysis fields, even if present on the underlying contract", async () => {
    const cookie = validWitnessSessionCookie();
    // Simulates the service accidentally leaking internal relations — the
    // controller/response shape shouldn't matter here since it just passes
    // through whatever the service returns, but this documents the
    // contract: nothing under these keys should ever appear in practice
    // because WITNESS_CONTRACT_SELECT never selects them in the first place.
    mockWitnessService.getWitnessScopedContract.mockResolvedValue({
      id: "contract-1",
      title: "Master Services Agreement",
      counterparty: "Acme Corp",
      businessStatus: "UNDER_REVIEW",
      legalState: null,
      tags: [],
      effectiveDate: null,
      expirationDate: null,
      extractedText: "Full contract text...",
      fileUrl: "https://s3.example.com/signed-url",
      fileUrlExpiresInSeconds: 900,
    } as never);

    const res = await request(app)
      .get("/api/witness/contract")
      .set("Cookie", cookie);

    expect(res.body.data).not.toHaveProperty("notes");
    expect(res.body.data).not.toHaveProperty("aiAnalyses");
    expect(res.body.data).not.toHaveProperty("organizationId");
    expect(res.body.data).not.toHaveProperty("uploadedByUserId");
    expect(res.body.data).not.toHaveProperty("fileKey");
  });
});

// ─── POST /api/users/witness-link/:id/revoke ───────────────────────────────────

describe("POST /api/users/witness-link/:id/revoke", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).post("/api/users/witness-link/witness-1/revoke");
    expect(res.status).toBe(401);
  });

  it("returns 403 for an INTERNAL caller — only Admin/Owner can revoke witness links", async () => {
    const res = await request(app)
      .post("/api/users/witness-link/witness-1/revoke")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockWitnessService.revokeWitnessLink).not.toHaveBeenCalled();
  });

  it("returns 200 for an ADMIN caller", async () => {
    mockWitnessService.revokeWitnessLink.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      token: null,
      witnessUrl: null,
      witnessEmail: "witness@example.com",
      witnessName: null,
      status: "revoked",
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    } as never);

    const res = await request(app)
      .post("/api/users/witness-link/witness-1/revoke")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("revoked");
    expect(mockWitnessService.revokeWitnessLink).toHaveBeenCalledWith(
      { id: "user-1", organizationId: "org-1" },
      "witness-1",
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
  });

  it("returns 200 for an OWNER caller", async () => {
    mockWitnessService.revokeWitnessLink.mockResolvedValue({
      id: "witness-1",
      status: "revoked",
    } as never);

    const res = await request(app)
      .post("/api/users/witness-link/witness-1/revoke")
      .set("Cookie", cookieFor("OWNER"));

    expect(res.status).toBe(200);
  });

  it("propagates a 404 when the invitation isn't found in the actor's org", async () => {
    const err = new Error("Witness invitation not found") as Error & { statusCode: number };
    err.statusCode = 404;
    mockWitnessService.revokeWitnessLink.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/users/witness-link/other-org-witness/revoke")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(404);
  });

  it("propagates a 409 when the invitation has already been revoked", async () => {
    const err = new Error("This witness invitation has already been revoked") as Error & {
      statusCode: number;
    };
    err.statusCode = 409;
    mockWitnessService.revokeWitnessLink.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/users/witness-link/witness-1/revoke")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(409);
  });
});

// ─── POST /api/users/witness-link/:id/resend ───────────────────────────────────

describe("POST /api/users/witness-link/:id/resend", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).post("/api/users/witness-link/witness-1/resend");
    expect(res.status).toBe(401);
  });

  it("returns 403 for an INTERNAL caller — only Admin/Owner can resend witness links", async () => {
    const res = await request(app)
      .post("/api/users/witness-link/witness-1/resend")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockWitnessService.resendWitnessLink).not.toHaveBeenCalled();
  });

  it("returns 200 for an ADMIN caller", async () => {
    mockWitnessService.resendWitnessLink.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      token: "new-raw-token",
      witnessUrl: "http://localhost:5173/witness/new-raw-token",
      witnessEmail: "witness@example.com",
      witnessName: null,
      status: "pending",
      expiresAt: new Date("2026-01-07"),
      createdAt: new Date("2026-01-01"),
    } as never);

    const res = await request(app)
      .post("/api/users/witness-link/witness-1/resend")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.token).toBe("new-raw-token");
    expect(mockWitnessService.resendWitnessLink).toHaveBeenCalledWith(
      { id: "user-1", organizationId: "org-1" },
      "witness-1",
    );
  });

  it("returns 200 for an OWNER caller", async () => {
    mockWitnessService.resendWitnessLink.mockResolvedValue({
      id: "witness-1",
      status: "pending",
    } as never);

    const res = await request(app)
      .post("/api/users/witness-link/witness-1/resend")
      .set("Cookie", cookieFor("OWNER"));

    expect(res.status).toBe(200);
  });

  it("propagates a 404 when the invitation isn't found in the actor's org", async () => {
    const err = new Error("Witness invitation not found") as Error & { statusCode: number };
    err.statusCode = 404;
    mockWitnessService.resendWitnessLink.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/users/witness-link/other-org-witness/resend")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(404);
  });

  it("propagates a 409 when the invitation has already been revoked", async () => {
    const err = new Error("This witness invitation has been revoked") as Error & {
      statusCode: number;
    };
    err.statusCode = 409;
    mockWitnessService.resendWitnessLink.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/users/witness-link/witness-1/resend")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(409);
  });

  it("propagates a 409 when the invitation has already been used", async () => {
    const err = new Error("This witness invitation has already been used") as Error & {
      statusCode: number;
    };
    err.statusCode = 409;
    mockWitnessService.resendWitnessLink.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/users/witness-link/witness-1/resend")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(409);
  });
});

// ─── Cross-flow: revoking mid-session actually cuts off access ────────────────

describe("Revocation cuts off an active witness session immediately", () => {
  it("rejects the next witnessSessionMiddleware-gated request once isRevoked flips to true", async () => {
    // Step 1: the witness has an active session — middleware sees a live,
    // unrevoked invitation and the scoped read succeeds.
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockWitnessDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    mockWitnessService.getWitnessScopedContract.mockResolvedValue({
      id: "contract-1",
      title: "MSA",
    } as never);

    const firstRes = await request(app)
      .get("/api/witness/contract")
      .set("Cookie", "witnessAccessToken=valid-session-jwt");
    expect(firstRes.status).toBe(200);

    // Step 2: an admin revokes the same invitation — no new session token
    // is issued to the witness; the existing cookie is untouched.
    // witnessSessionMiddleware re-checks the DB (not the JWT) on every
    // request, so this is what actually needs to change for access to stop.
    mockWitnessDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // Step 3: the same session cookie, same JWT, same everything — but the
    // very next request is rejected because isRevoked is now true.
    const secondRes = await request(app)
      .get("/api/witness/contract")
      .set("Cookie", "witnessAccessToken=valid-session-jwt");

    expect(secondRes.status).toBe(403);
    // getWitnessScopedContract was only ever called for the first, still-
    // valid request — the middleware short-circuited the second one.
    expect(mockWitnessService.getWitnessScopedContract).toHaveBeenCalledTimes(1);
  });
});
