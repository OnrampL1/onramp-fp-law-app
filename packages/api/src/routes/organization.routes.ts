import { Router } from "express";
import { auditController } from "../controllers/audit.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ADMIN_ROLES } from "@starter-kit/shared";
import {
  listAuditLogsQuerySchema,
  listContractAuditLogsQuerySchema,
} from "../schemas/audit.schemas";

const router = Router();

router.use(authenticate);

// Audit trail review is Owner/Admin oversight only (Domain & Business
// Rules, Section 10) — internal members are excluded.
router.get(
  "/:id/audit-logs",
  authorize(...ADMIN_ROLES),
  validate(listAuditLogsQuerySchema, "query"),
  auditController.listForOrganization,
);

// Dashboard's curated activity feed — same fixed action whitelist as the
// per-contract timeline (GET /contracts/:id/timeline), applied org-wide.
// Distinct from /audit-logs above: never exposes the raw audit trail or
// accepts a caller-supplied action filter, so it's open to every dashboard
// role, Internal included.
router.get(
  "/:id/activity",
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(listContractAuditLogsQuerySchema, "query"),
  auditController.listActivityForOrganization,
);

export { router as organizationRouter };
