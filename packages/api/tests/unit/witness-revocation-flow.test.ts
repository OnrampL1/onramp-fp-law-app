import type { Request, Response, NextFunction } from "express";

// A tiny in-memory backing store for one WitnessInvitation row, shared by
// witnessService and witnessSessionMiddleware exactly like the real
// getPrismaClient() singleton is shared by both modules in production —
// this is what makes the test below a genuine proof rather than an
// assertion against two separately-mocked halves.
let invitationRow: {
  id: string;
  contractId: string;
  tokenHash: string;
  witnessEmail: string;
  witnessName: string | null;
  status: "ISSUED" | "USED" | "EXPIRED" | "REVOKED";
  isRevoked: boolean;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  contract: { id: string; organizationId: string };
};

function resetInvitationRow() {
  invitationRow = {
    id: "witness-1",
    contractId: "contract-1",
    tokenHash: "hashed-raw-token",
    witnessEmail: "witness@example.com",
    witnessName: null,
    status: "ISSUED",
    isRevoked: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date("2026-01-01"),
    contract: { id: "contract-1", organizationId: "org-1" },
  };
}

const mockDb = {
  witnessInvitation: {
    findUnique: jest.fn(async ({ where }: { where: { tokenHash?: string; id?: string } }) => {
      if (where.tokenHash !== undefined && where.tokenHash !== invitationRow.tokenHash) {
        return null;
      }
      if (where.id !== undefined && where.id !== invitationRow.id) {
        return null;
      }
      return { ...invitationRow, contract: { ...invitationRow.contract } };
    }),
    findFirst: jest.fn(
      async ({ where }: { where: { id: string; contract: { organizationId: string } } }) => {
        if (
          where.id !== invitationRow.id ||
          where.contract.organizationId !== invitationRow.contract.organizationId
        ) {
          return null;
        }
        return { ...invitationRow, contract: { ...invitationRow.contract } };
      },
    ),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string; status: string };
        data: { status: "USED"; usedAt: Date };
      }) => {
        if (invitationRow.id !== where.id || invitationRow.status !== where.status) {
          return { count: 0 };
        }
        invitationRow = { ...invitationRow, status: data.status, usedAt: data.usedAt };
        return { count: 1 };
      },
    ),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<typeof invitationRow>;
      }) => {
        if (invitationRow.id !== where.id) {
          throw new Error("row not found");
        }
        invitationRow = { ...invitationRow, ...data };
        return { ...invitationRow, contract: { ...invitationRow.contract } };
      },
    ),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
};

// Real hash/sign/verify semantics (not just stand-ins that always succeed)
// so the token round-trips the same way it does in production: redeem
// hashes the raw token to look it up, and the session token genuinely
// encodes which invitation it belongs to.
jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
  hashToken: (raw: string) => `hashed-${raw}`,
  generateRawToken: () => "raw-token",
  signWitnessSessionToken: (witnessInvitationId: string) =>
    `session-token-for-${witnessInvitationId}`,
  verifyWitnessSessionToken: (token: string) => {
    const match = /^session-token-for-(.+)$/.exec(token);
    if (!match) {
      throw new Error("invalid witness session token");
    }
    return { witnessInvitationId: match[1], jti: "jti-1" };
  },
}));

import { witnessService } from "../../src/services/witness.service";
import { witnessSessionMiddleware } from "../../src/middleware/witness-session.middleware";

function createMockResponse() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

function createRequest(cookieToken?: string): Request {
  return {
    cookies: cookieToken ? { witnessAccessToken: cookieToken } : {},
  } as unknown as Request;
}

const actor = { id: "actor-1", organizationId: "org-1" };

beforeEach(() => {
  jest.clearAllMocks();
  resetInvitationRow();
});

describe("Revoking mid-session cuts off access immediately", () => {
  it("redeem -> middleware succeeds -> revoke -> the same session is rejected on its very next request", async () => {
    // 1. Redeem the raw token — this is the real WitnessService method,
    // hitting the same mockDb the middleware will read from next.
    const { sessionToken } = await witnessService.redeemWitnessLink("raw-token");
    expect(invitationRow.status).toBe("USED");

    // 2. With that real session token, the real middleware grants access.
    const reqBefore = createRequest(sessionToken);
    const resBefore = createMockResponse();
    const nextBefore = jest.fn() as NextFunction;

    await witnessSessionMiddleware(reqBefore, resBefore, nextBefore);

    expect(nextBefore).toHaveBeenCalledTimes(1);
    expect(reqBefore.witnessSession).toEqual({
      witnessInvitationId: "witness-1",
      contractId: "contract-1",
    });
    expect(resBefore.status).not.toHaveBeenCalled();

    // 3. An admin revokes the invitation mid-session — no new token is
    // issued to the witness; their existing cookie/session-token is
    // completely untouched. Only the database row changes.
    await witnessService.revokeWitnessLink(actor, "witness-1");
    expect(invitationRow.isRevoked).toBe(true);
    expect(invitationRow.status).toBe("REVOKED");

    // 4. The exact same session token, presented again, is now rejected —
    // proving the middleware re-checks the database on every request
    // rather than trusting anything encoded in the token itself.
    const reqAfter = createRequest(sessionToken);
    const resAfter = createMockResponse();
    const nextAfter = jest.fn() as NextFunction;

    await witnessSessionMiddleware(reqAfter, resAfter, nextAfter);

    expect(resAfter.status).toHaveBeenCalledWith(403);
    expect(nextAfter).not.toHaveBeenCalled();
    expect(reqAfter.witnessSession).toBeUndefined();
  });

  it("a token that was never redeemed still can't be revoked into a valid session (sanity check on the shared row)", async () => {
    // Redeeming again after revocation should fail too — the link itself
    // is dead, not just the session.
    await witnessService.redeemWitnessLink("raw-token");
    await witnessService.revokeWitnessLink(actor, "witness-1");

    await expect(witnessService.redeemWitnessLink("raw-token")).rejects.toMatchObject({
      statusCode: 410,
    });
  });
});
