import { Router } from "express";
import { contractController } from "../controllers/contract.controller";
import { auditController } from "../controllers/audit.controller";
import { authenticate, withAuth } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ADMIN_ROLES } from "@starter-kit/shared";
import { listContractsQuerySchema } from "../schemas/contract.schemas";
import { listContractAuditLogsQuerySchema } from "../schemas/audit.schemas";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(listContractsQuerySchema, "query"),
  withAuth(contractController.list),
);

// Thin wrapper over the same org-wide audit service, contractId pre-filled
// from the path. Owner/Admin oversight only (Domain & Business Rules,
// Section 10).
router.get(
  "/:id/audit",
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(listContractAuditLogsQuerySchema, "query"),
  auditController.listForContract,
);

export { router as contractRouter };
