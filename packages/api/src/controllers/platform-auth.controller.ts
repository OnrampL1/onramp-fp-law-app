import type { Request, Response, NextFunction } from "express";
import { platformAuthService } from "../services/platform-auth.service";

const isProduction = process.env.NODE_ENV === "production";

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setPlatformAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api",
    maxAge: ACCESS_MAX_AGE,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/platform/auth/refresh",
    maxAge: REFRESH_MAX_AGE,
  });
}

function clearPlatformAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/api" });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/platform/auth/refresh" });
}

export const platformAuthController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { platformUser, accessToken, refreshToken } =
        await platformAuthService.login(req.body);

      setPlatformAuthCookies(res, accessToken, refreshToken);

      res.json({ data: { platformUser } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

      if (!refreshToken) {
        res.status(401).json({ error: "Missing refresh token" });
        return;
      }

      const tokens = await platformAuthService.refresh(refreshToken);
      setPlatformAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.json({ data: { message: "Token refreshed" } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessToken = req.cookies?.[ACCESS_COOKIE] as string | undefined;
      const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

      await platformAuthService.logout(accessToken, refreshToken);
      clearPlatformAuthCookies(res);

      res.json({ data: { message: "Logged out successfully" } });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platformUser = await platformAuthService.getProfile(
        req.platformUser!.id,
      );

      res.json({ data: platformUser });
    } catch (err) {
      next(err);
    }
  },
};
