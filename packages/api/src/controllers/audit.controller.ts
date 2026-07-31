import type { Request, Response, NextFunction } from "express";
import type { AuditAction } from "@prisma/client";
import { auditService } from "../services/audit.service";
import { createError } from "../middleware/error-handler";

interface OrgAuditListQuery {
  contractId?: string;
  actorUserId?: string;
  action?: AuditAction;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

type ContractAuditListQuery = Omit<OrgAuditListQuery, "contractId">;

export const auditController = {
  // GET /organizations/:id/audit-logs — org derived from the authenticated
  // user, the path param is only checked against it (never trusted alone).
  async listForOrganization(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (req.params.id !== req.user!.orgId) {
        throw createError("Organization not found", 404);
      }

      const { contractId, actorUserId, action, dateFrom, dateTo, page, limit } =
        req.query as unknown as OrgAuditListQuery;

      const { data, pagination } = await auditService.listAuditLogs(
        req.user!.orgId,
        { contractId, actorUserId, action, dateFrom, dateTo },
        { page, limit },
      );

      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },

  // GET /contracts/:id/audit — thin wrapper delegating to the same service
  // with contractId pre-filled from the path.
  async listForContract(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { actorUserId, action, dateFrom, dateTo, page, limit } =
        req.query as unknown as ContractAuditListQuery;

      const { data, pagination } = await auditService.listAuditLogs(
        req.user!.orgId,
        {
          contractId: req.params.id as string,
          actorUserId,
          action,
          dateFrom,
          dateTo,
        },
        { page, limit },
      );

      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },
};
