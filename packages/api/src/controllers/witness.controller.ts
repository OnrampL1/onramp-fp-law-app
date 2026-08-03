import type { Request, Response, NextFunction } from "express";
import type { AccessTokenPayload } from "@starter-kit/shared";
import { witnessService } from "../services/witness.service";
import { WITNESS_SESSION_COOKIE } from "../constants/witness.constants";
import type { WitnessAuthenticatedRequest } from "../middleware/witness-session.middleware";

const isProduction = process.env.NODE_ENV === "production";

// Matches signWitnessSessionToken's own expiry (packages/shared/auth/witness-session.ts)
// — the cookie shouldn't outlive the token it carries.
const WITNESS_SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function actorFrom(payload: AccessTokenPayload) {
  return { id: payload.userId, organizationId: payload.orgId };
}

function requestContextFrom(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get("user-agent") };
}

export const witnessController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, contractId } = req.query as unknown as {
        page: number;
        limit: number;
        contractId?: string;
      };
      const { data, pagination } = await witnessService.listWitnessLinks(
        req.user!.orgId,
        { contractId },
        { page, limit },
      );
      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },

  async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await witnessService.getWitnessLinkStats(req.user!.orgId);
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const witnessToken = await witnessService.createWitnessLink(
        actorFrom(req.user!),
        req.body,
        requestContextFrom(req),
      );
      res.status(201).json({ data: witnessToken });
    } catch (err) {
      next(err);
    }
  },

  async redeem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionToken, contract, witnessToken } =
        await witnessService.redeemWitnessLink(
          req.params.token as string,
          requestContextFrom(req),
        );

      res.cookie(WITNESS_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/api",
        maxAge: WITNESS_SESSION_MAX_AGE,
      });
      res.json({ data: { contract, witnessToken } });
    } catch (err) {
      next(err);
    }
  },

  async getContract(
    req: WitnessAuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // The only contractId this handler is ever allowed to read — set by
      // witnessSessionMiddleware from the invitation row, never from a
      // param/query/body field on this request.
      const contract = await witnessService.getWitnessScopedContract(
        req.witnessSession.contractId,
      );
      res.json({ data: contract });
    } catch (err) {
      next(err);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const witnessToken = await witnessService.revokeWitnessLink(
        actorFrom(req.user!),
        req.params.id as string,
        requestContextFrom(req),
      );
      res.json({ data: witnessToken });
    } catch (err) {
      next(err);
    }
  },

  async resend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const witnessToken = await witnessService.resendWitnessLink(
        actorFrom(req.user!),
        req.params.id as string,
      );
      res.json({ data: witnessToken });
    } catch (err) {
      next(err);
    }
  },
};
