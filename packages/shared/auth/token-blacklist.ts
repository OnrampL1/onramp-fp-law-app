import jwt from "jsonwebtoken";
import IORedis from "ioredis";

const BLACKLIST_PREFIX = "auth:blacklist:";

let blacklistRedis: IORedis | null = null;

/**
 * A dedicated connection, separate from the BullMQ one in queue/client.ts.
 * BullMQ requires maxRetriesPerRequest: null, which means commands on that
 * connection queue indefinitely during a Redis outage instead of failing —
 * fine for background job processing, but it would make every authenticated
 * request hang forever rather than surfacing a clear error. Auth checks need
 * to fail fast instead.
 */
function getBlacklistRedisConnection(): IORedis {
  if (!blacklistRedis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    blacklistRedis = new IORedis(url, {
      maxRetriesPerRequest: 1,
      commandTimeout: 2000,
      // Without this, ioredis queues commands while disconnected and waits
      // for a connection instead of failing — commandTimeout alone only
      // covers a command that's already been sent and is awaiting a reply.
      enableOfflineQueue: false,
    });
    blacklistRedis.on("error", (err) => {
      console.error("[token-blacklist] Redis connection error:", err.message);
    });
  }
  return blacklistRedis;
}

/*
 * Connects eagerly at server startup instead of lazily on the first
 * authenticated request. Without this, the first request after a fresh
 * start can race the connection's handshake.
 * enableOfflineQueue: false means that request fails immediately instead
 * of waiting, since a real outage should also fail fast rather than hang.
 */
export async function connectTokenBlacklist(): Promise<void> {
  const client = getBlacklistRedisConnection();
  if (client.status === "ready") return;

  await new Promise<void>((resolve, reject) => {
    client.once("ready", resolve);
    client.once("error", reject);
  });
}

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

  await getBlacklistRedisConnection().set(
    `${BLACKLIST_PREFIX}${decoded.jti}`,
    "1",
    "EX",
    ttlSeconds,
  );
}

export async function isJtiBlacklisted(jti: string): Promise<boolean> {
  const result = await getBlacklistRedisConnection().get(
    `${BLACKLIST_PREFIX}${jti}`,
  );
  return result !== null;
}
