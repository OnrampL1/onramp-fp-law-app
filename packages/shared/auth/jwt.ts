import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { AccessTokenPayload, RefreshTokenPayload, TokenPair } from "./types";

function getSecret(envKey: string, fallback: string): string {
  const value = process.env[envKey];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var: ${envKey}`);
  }
  return value ?? fallback;
}

export function signAccessToken(
  payload: Omit<AccessTokenPayload, "jti">,
): string {
  const secret = getSecret("JWT_SECRET", "dev-access-secret");
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "15m";
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, jti }, secret, { expiresIn } as jwt.SignOptions);
}

export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, "jti">,
): string {
  const secret = getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret");
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, jti }, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = getSecret("JWT_SECRET", "dev-access-secret");
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret");
  return jwt.verify(token, secret) as RefreshTokenPayload;
}

export function generateTokenPair(
  payload: Omit<AccessTokenPayload, "jti">,
): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ userId: payload.userId }),
  };
}
