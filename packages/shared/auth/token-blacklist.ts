import jwt from "jsonwebtoken";
import { getRedisConnection } from "../queue/client";

const BLACKLIST_PREFIX = "auth:blacklist:";

interface DecodedTokenClaims {
  jti?: string;
  exp?: number;
}

/**
 * Revokes a token immediately by recording its jti in Redis until the
 * token's own expiry would have arrived anyway (Blueprint I.2: "Revocation:
 * Redis blacklist (jti)", TTL = remaining validity). The token is only
 * decoded here, not re-verified — callers are expected to have already
 * verified it before deciding to revoke it.
 */
export async function blacklistToken(token: string): Promise<void> {
  const decoded = jwt.decode(token) as DecodedTokenClaims | null;
  if (!decoded?.jti || !decoded.exp) return;

  const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttlSeconds <= 0) return;

  await getRedisConnection().set(
    `${BLACKLIST_PREFIX}${decoded.jti}`,
    "1",
    "EX",
    ttlSeconds,
  );
}

export async function isJtiBlacklisted(jti: string): Promise<boolean> {
  const result = await getRedisConnection().get(`${BLACKLIST_PREFIX}${jti}`);
  return result !== null;
}
