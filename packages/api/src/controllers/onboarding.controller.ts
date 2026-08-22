import type { Request, Response, NextFunction } from "express";
import { onboardingService } from "../services/onboarding.service";

function requestContextFrom(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const onboardingController = {
  async getOrganizationOnboarding(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const onboarding = await onboardingService.getOrganizationOnboarding({
        userId: req.user!.userId,
        organizationId: req.user!.orgId,
        role: req.user!.role,
      });

      res.json({ data: onboarding });
    } catch (err) {
      next(err);
    }
  },

  async completeOrganizationOnboarding(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const onboarding = await onboardingService.completeOrganizationOnboarding(
        {
          userId: req.user!.userId,
          organizationId: req.user!.orgId,
          role: req.user!.role,
        },
        req.body,
        requestContextFrom(req),
      );

      res.json({ data: onboarding });
    } catch (err) {
      next(err);
    }
  },
};
