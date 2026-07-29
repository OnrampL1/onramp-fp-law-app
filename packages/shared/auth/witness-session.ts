import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// Deliberately separate from AccessTokenPayload/signAccessToken: a witness
// has no User row, no organizationId, and no role — reusing the member
// auth shape would be structurally wrong, not just a naming mismatch.
export interface WitnessSessionPayload {
  witnessInvitationId: string;
  jti: string;
}

// This token only ever proves "which WitnessInvitation issued this
// session" — it is NOT the source of truth for whether access is still
// allowed. The witness-session middleware re-checks isRevoked/expiresAt
// against the database on every request, so revocation takes effect
// immediately rather than waiting for this token to expire on its own.
const SESSION_TTL = "24h";

function getSecret(): string {
  const value = process.env.WITNESS_SESSION_JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("Missing required env var: WITNESS_SESSION_JWT_SECRET");
  }
  return value ?? "dev-witness-session-secret";
}

export function signWitnessSessionToken(witnessInvitationId: string): string {
  const jti = crypto.randomUUID();
  return jwt.sign({ witnessInvitationId, jti }, getSecret(), {
    expiresIn: SESSION_TTL,
  });
}

export function verifyWitnessSessionToken(token: string): WitnessSessionPayload {
  return jwt.verify(token, getSecret()) as WitnessSessionPayload;
}
