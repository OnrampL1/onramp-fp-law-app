export type UserRole = "admin" | "lawyer" | "paralegal" | "user";

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
