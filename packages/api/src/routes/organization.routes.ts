import { Router } from "express";
import { auditController } from "../controllers/audit.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ADMIN_ROLES } from "@starter-kit/shared";
import { listAuditLogsQuerySchema } from "../schemas/audit.schemas";

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

export { router as organizationRouter };
