import type { Request, Response, NextFunction } from "express";
import type { AccessTokenPayload } from "@starter-kit/shared";
import { invitationService } from "../services/invitation.service";

function actorFrom(payload: AccessTokenPayload) {
  return { id: payload.userId, organizationId: payload.orgId };
}

export const invitationController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const invitation = await invitationService.createInvitation(
        actorFrom(req.user!),
        req.body,
      );
      res.status(201).json({ data: invitation });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as unknown as {
        page: number;
        limit: number;
      };
      const { data, pagination } = await invitationService.listInvitations(
        req.user!.orgId,
        { page, limit },
      );
      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },

  async resend(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const invitation = await invitationService.resendInvitation(
        actorFrom(req.user!),
        req.params.id as string,
      );
      res.json({ data: invitation });
    } catch (err) {
      next(err);
    }
  },
};
