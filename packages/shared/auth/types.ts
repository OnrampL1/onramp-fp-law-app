import type { UserRole } from "@prisma/client";

export type { UserRole };

export interface AccessTokenPayload {
  userId: string;
  orgId: string;
  role: UserRole;
  jti: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
}
