import type {
  OrganizationStatus,
  PlatformUserRole,
  UserRole,
} from "@prisma/client";

export type { OrganizationStatus, PlatformUserRole, UserRole };

export interface AccessTokenPayload {
  actorType?: "USER";
  userId: string;
  orgId: string;
  role: UserRole;
  jti: string;
}

export interface RefreshTokenPayload {
  actorType?: "USER";
  userId: string;
  jti: string;
}

export interface PlatformAccessTokenPayload {
  actorType: "PLATFORM_USER";
  platformUserId: string;
  role: PlatformUserRole;
  jti: string;
}

export interface PlatformRefreshTokenPayload {
  actorType: "PLATFORM_USER";
  platformUserId: string;
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
  organizationStatus: OrganizationStatus;
  onboardingRequired: boolean;
  mustChangePassword: boolean;
}

export interface PlatformAuthUser {
  id: string;
  email: string;
  fullName: string;
  role: PlatformUserRole;
}
