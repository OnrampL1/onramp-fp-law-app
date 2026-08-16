import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type {
  AccessTokenPayload,
  PlatformAccessTokenPayload,
  PlatformRefreshTokenPayload,
  RefreshTokenPayload,
  TokenPair,
} from "./types";

function getSecret(envKey: string, fallback: string): string {
  const value = process.env[envKey];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var: ${envKey}`);
  }
  return value ?? fallback;
}

function isPlatformRole(value: unknown): boolean {
  return value === "SUPER_ADMIN" || value === "SUPPORT_ENGINEER";
}

export function signAccessToken(
  payload: Omit<AccessTokenPayload, "jti" | "actorType">,
): string {
  const secret = getSecret("JWT_SECRET", "dev-access-secret");
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "15m";
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, actorType: "USER", jti }, secret, {
    expiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, "jti" | "actorType">,
): string {
  const secret = getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret");
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, actorType: "USER", jti }, secret, {
    expiresIn,
  } as jwt.SignOptions);
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
  payload: Omit<AccessTokenPayload, "jti" | "actorType">,
): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ userId: payload.userId }),
  };
}

export function signPlatformAccessToken(
  payload: Omit<PlatformAccessTokenPayload, "jti" | "actorType">,
): string {
  const secret = getSecret("JWT_SECRET", "dev-access-secret");
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "15m";
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, actorType: "PLATFORM_USER", jti }, secret, {
    expiresIn,
  } as jwt.SignOptions);
}

export function signPlatformRefreshToken(
  payload: Omit<PlatformRefreshTokenPayload, "jti" | "actorType">,
): string {
  const secret = getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret");
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, actorType: "PLATFORM_USER", jti }, secret, {
    expiresIn,
  } as jwt.SignOptions);
}

export function verifyPlatformAccessToken(
  token: string,
): PlatformAccessTokenPayload {
  const secret = getSecret("JWT_SECRET", "dev-access-secret");
  const payload = jwt.verify(token, secret) as PlatformAccessTokenPayload;

  if (
    payload.actorType !== "PLATFORM_USER" ||
    typeof payload.platformUserId !== "string" ||
    !isPlatformRole(payload.role) ||
    typeof payload.jti !== "string"
  ) {
    throw new Error("Invalid platform access token");
  }

  return payload;
}

export function verifyPlatformRefreshToken(
  token: string,
): PlatformRefreshTokenPayload {
  const secret = getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret");
  const payload = jwt.verify(token, secret) as PlatformRefreshTokenPayload;

  if (
    payload.actorType !== "PLATFORM_USER" ||
    typeof payload.platformUserId !== "string" ||
    typeof payload.jti !== "string"
  ) {
    throw new Error("Invalid platform refresh token");
  }

  return payload;
}

export function generatePlatformTokenPair(
  payload: Omit<PlatformAccessTokenPayload, "jti" | "actorType">,
): TokenPair {
  return {
    accessToken: signPlatformAccessToken(payload),
    refreshToken: signPlatformRefreshToken({
      platformUserId: payload.platformUserId,
    }),
  };
}
