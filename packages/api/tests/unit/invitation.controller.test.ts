import request from "supertest";

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/invitation.service", () => ({
  invitationService: {
    createInvitation: jest.fn(),
    listInvitations: jest.fn(),
    resendInvitation: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { invitationService } from "../../src/services/invitation.service";

const mockInvitationService = invitationService as jest.Mocked<
  typeof invitationService
>;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL") {
  const token = signAccessToken({ userId: "user-1", orgId: "org-1", role });
  return `accessToken=${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/invitations ─────────────────────────────────────────────────────

describe("POST /api/invitations", () => {
  it("returns 403 for an INTERNAL caller", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set("Cookie", cookieFor("INTERNAL"))
      .send({ email: "new@example.com", fullName: "Jordan Lee", role: "INTERNAL" });

    expect(res.status).toBe(403);
  });

  it("returns 422 when role is OWNER", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ email: "new@example.com", fullName: "Jordan Lee", role: "OWNER" });

    expect(res.status).toBe(422);
    expect(mockInvitationService.createInvitation).not.toHaveBeenCalled();
  });

  it("returns 201 on success for an ADMIN caller", async () => {
    mockInvitationService.createInvitation.mockResolvedValue({
      id: "inv-1",
      email: "new@example.com",
      role: "INTERNAL",
      status: "PENDING",
    } as never);

    const res = await request(app)
      .post("/api/invitations")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ email: "new@example.com", fullName: "Jordan Lee", role: "INTERNAL" });

    expect(res.status).toBe(201);
    expect(mockInvitationService.createInvitation).toHaveBeenCalledWith(
      { id: "user-1", organizationId: "org-1" },
      { email: "new@example.com", fullName: "Jordan Lee", role: "INTERNAL" },
    );
  });
});

// ─── GET /api/invitations ──────────────────────────────────────────────────────

describe("GET /api/invitations", () => {
  it("returns 200 for an OWNER caller", async () => {
    mockInvitationService.listInvitations.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const res = await request(app)
      .get("/api/invitations")
      .set("Cookie", cookieFor("OWNER"));

    expect(res.status).toBe(200);
  });

  it("returns 200 for an INTERNAL caller — viewing pending invitations isn't admin-only", async () => {
    mockInvitationService.listInvitations.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const res = await request(app)
      .get("/api/invitations")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(200);
  });
});

// ─── POST /api/invitations/:id/resend ──────────────────────────────────────────

describe("POST /api/invitations/:id/resend", () => {
  it("returns 403 for an INTERNAL caller", async () => {
    const res = await request(app)
      .post("/api/invitations/inv-1/resend")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
  });

  it("returns 200 on success", async () => {
    mockInvitationService.resendInvitation.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
    } as never);

    const res = await request(app)
      .post("/api/invitations/inv-1/resend")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
  });
});
