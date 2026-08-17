import type { Request, Response, NextFunction } from "express";
import type { AuditAction } from "@prisma/client";
import { auditService } from "../services/audit.service";
import { createError } from "../middleware/error-handler";

// The curated subset of AuditAction values meaningful on a Contract
// Details activity timeline (visible to any org member) — as opposed to
// the full org-wide audit trail (/audit, Owner/Admin oversight only,
// Domain & Business Rules Section 10). A fixed list, not a caller-supplied
// filter — every value here already has real display copy in the
// frontend's AUDIT_ACTION_LABELS.
const CONTRACT_TIMELINE_ACTIONS: AuditAction[] = [
  "CONTRACT_UPLOADED",
  "CONTRACT_METADATA_UPDATED",
  "CONTRACT_CONTENT_UPDATED",
  "CONTRACT_TEXT_EXTRACTED",
  "CONTRACT_PROCESSING_STATUS_CHANGED",
  "CONTRACT_LEGAL_STATE_CHANGED",
  "AI_ANALYSIS_COMPLETED",
  "AI_ANALYSIS_FAILED",
  "WITNESS_INVITATION_CREATED",
  "WITNESS_ACCESSED",
  "WITNESS_INVITATION_REVOKED",
  "NOTE_ADDED",
  "NOTE_EDITED",
  "NOTE_DELETED",
];

interface OrgAuditListQuery {
  contractId?: string;
  actorUserId?: string;
  action?: AuditAction | AuditAction[];
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

  // GET /contracts/:id/timeline — any Owner/Admin/Internal (unlike
  // listForContract's /audit, which stays Owner/Admin-only oversight).
  // Same underlying service, filtered to a fixed, display-ready action
  // whitelist rather than an arbitrary caller-supplied filter — page/limit
  // are the only query params this endpoint actually consumes.
  async listTimelineForContract(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { page, limit } = req.query as unknown as {
        page: number;
        limit: number;
      };

      const { data, pagination } = await auditService.listAuditLogs(
        req.user!.orgId,
        {
          contractId: req.params.id as string,
          action: CONTRACT_TIMELINE_ACTIONS,
        },
        { page, limit },
      );

      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },

  // GET /organizations/:id/activity — the dashboard's curated activity
  // feed. Same fixed CONTRACT_TIMELINE_ACTIONS whitelist as the per-contract
  // timeline above, applied org-wide instead of scoped to one contract, and
  // never accepts a caller-supplied action filter — unlike /audit-logs
  // (Owner/Admin oversight only, Domain & Business Rules Section 10), this
  // never exposes the raw/unfiltered audit trail, so it's safe to open to
  // every dashboard role including Internal.
  async listActivityForOrganization(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (req.params.id !== req.user!.orgId) {
        throw createError("Organization not found", 404);
      }

      const { page, limit } = req.query as unknown as {
        page: number;
        limit: number;
      };

      const { data, pagination } = await auditService.listAuditLogs(
        req.user!.orgId,
        { action: CONTRACT_TIMELINE_ACTIONS },
        { page, limit },
      );

      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },
};
