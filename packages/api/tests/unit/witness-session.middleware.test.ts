import type { Request, Response, NextFunction } from "express";

const mockDb = {
  witnessInvitation: {
    findUnique: jest.fn(),
  },
};

const mockVerifyWitnessSessionToken = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
  verifyWitnessSessionToken: (token: string) => mockVerifyWitnessSessionToken(token),
}));

import { witnessSessionMiddleware } from "../../src/middleware/witness-session.middleware";

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    cookies: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("witnessSessionMiddleware", () => {
  it("returns 401 when there is no witnessAccessToken cookie", async () => {
    const req = createRequest({ cookies: {} });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(mockDb.witnessInvitation.findUnique).not.toHaveBeenCalled();
  });

  it("returns 401 when the cookie fails signature/expiry verification", async () => {
    mockVerifyWitnessSessionToken.mockImplementation(() => {
      throw new Error("jwt expired");
    });
    const req = createRequest({ cookies: { witnessAccessToken: "garbage" } });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the token verifies but no matching invitation exists", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockDb.witnessInvitation.findUnique.mockResolvedValue(null);

    const req = createRequest({ cookies: { witnessAccessToken: "valid-jwt" } });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the invitation has since been revoked — checked live, not from the token", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const req = createRequest({ cookies: { witnessAccessToken: "valid-jwt" } });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the invitation has since expired — checked live, not from the token", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: false,
      expiresAt: new Date(Date.now() - 1000),
    });

    const req = createRequest({ cookies: { witnessAccessToken: "valid-jwt" } });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches req.witnessSession scoped to the invitation's own contractId and calls next()", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const req = createRequest({ cookies: { witnessAccessToken: "valid-jwt" } });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(req.witnessSession).toEqual({
      witnessInvitationId: "witness-1",
      contractId: "contract-1",
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied contractId entirely — the scope always comes from the invitation, never the request", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // A crafted request trying to reach a different contract via params
    // and body — the middleware never reads either of these fields.
    const req = createRequest({
      cookies: { witnessAccessToken: "valid-jwt" },
      params: { contractId: "some-other-contract" },
      body: { contractId: "some-other-contract" },
    });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(req.witnessSession?.contractId).toBe("contract-1");
    expect(req.witnessSession?.contractId).not.toBe("some-other-contract");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("looks up the invitation by the id embedded in the verified token, not by any request field", async () => {
    mockVerifyWitnessSessionToken.mockReturnValue({
      witnessInvitationId: "witness-1",
      jti: "jti-1",
    });
    mockDb.witnessInvitation.findUnique.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const req = createRequest({
      cookies: { witnessAccessToken: "valid-jwt" },
      params: { witnessInvitationId: "attacker-supplied-id" },
    });
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await witnessSessionMiddleware(req, res, next);

    expect(mockDb.witnessInvitation.findUnique).toHaveBeenCalledWith({
      where: { id: "witness-1" },
    });
  });
});
