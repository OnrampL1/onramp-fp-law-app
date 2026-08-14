import { Router } from "express";
import { contractController } from "../controllers/contract.controller";
import { auditController } from "../controllers/audit.controller";
import { authenticate, withAuth } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { parseContractUploadFile } from "../middleware/contract-upload.middleware";
import { ADMIN_ROLES } from "@starter-kit/shared";
import {
  contractIdParamSchema,
  listContractsQuerySchema,
  updateContractMetadataSchema,
} from "../schemas/contract.schemas";
import { listContractAuditLogsQuerySchema } from "../schemas/audit.schemas";
import { aiAnalysisController } from "../controllers/ai-analysis.controller";
import {
  aiAnalysisIdParamSchema,
  listAIAnalysesQuerySchema,
} from "../schemas/ai-analysis.schemas";
import { contractInvestigatorController } from "../controllers/contract-investigator.controller";
import { askInvestigatorBodySchema } from "../schemas/contract-investigator.schemas";
import {
  contractNoteIdParamSchema,
  createContractNoteSchema,
  listContractNotesQuerySchema,
  updateContractNoteSchema,
} from "../schemas/contract-note.schemas";
import { contractNoteController } from "../controllers/contract-note.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  parseContractUploadFile,
  withAuth(contractController.upload),
);

router.get(
  "/",
  authenticate,
  validate(listContractsQuerySchema, "query"),
  withAuth(contractController.list),
);

router.get(
  "/:id",
  authenticate,
  validate(contractIdParamSchema, "params"),
  withAuth(contractController.getById),
);

router.get(
  "/:id/content",
  authenticate,
  validate(contractIdParamSchema, "params"),
  withAuth(contractController.getContent),
);

// Full-replace metadata edit (DDS §1.8 optimistic concurrency via `version`).
// Same role set as upload — Owner/Admin/Internal may edit; Witness may not.
router.put(
  "/:id/metadata",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(contractIdParamSchema, "params"),
  validate(updateContractMetadataSchema, "body"),
  withAuth(contractController.updateMetadata),
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

router.get(
  "/:id/timeline",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(contractIdParamSchema, "params"),
  validate(listContractAuditLogsQuerySchema, "query"),
  auditController.listTimelineForContract,
);

router.get(
  "/:id/analyses",
  authenticate,
  validate(contractIdParamSchema, "params"),
  validate(listAIAnalysesQuerySchema, "query"),
  withAuth(aiAnalysisController.list),
);

router.post(
  "/:id/analyses",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(contractIdParamSchema, "params"),
  withAuth(aiAnalysisController.trigger),
);

router.get(
  "/:id/analyses/:analysisId",
  authenticate,
  validate(aiAnalysisIdParamSchema, "params"),
  withAuth(aiAnalysisController.getById),
);

// Clause Investigator (AI_ARCHITECTURE.md Section 6): synchronous
// retrieve-then-generate, not a queued job like AI Analysis — the whole
// point is a fast, conversational round trip.
router.post(
  "/:id/investigator/ask",
  authenticate,
  validate(contractIdParamSchema, "params"),
  validate(askInvestigatorBodySchema, "body"),
  withAuth(contractInvestigatorController.ask),
);

router.get(
  "/:id/risk-overview",
  authenticate,
  validate(contractIdParamSchema, "params"),
  withAuth(aiAnalysisController.riskOverview),
);

router.get(
  "/:id/summary-overview",
  authenticate,
  validate(contractIdParamSchema, "params"),
  withAuth(aiAnalysisController.summaryOverview),
);

router.get(
  "/:id/notes",
  authenticate,
  validate(contractIdParamSchema, "params"),
  validate(listContractNotesQuerySchema, "query"),
  withAuth(contractNoteController.list),
);

router.post(
  "/:id/notes",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(contractIdParamSchema, "params"),
  validate(createContractNoteSchema, "body"),
  withAuth(contractNoteController.create),
);

router.put(
  "/:id/notes/:noteId",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(contractNoteIdParamSchema, "params"),
  validate(updateContractNoteSchema, "body"),
  withAuth(contractNoteController.update),
);

router.delete(
  "/:id/notes/:noteId",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(contractNoteIdParamSchema, "params"),
  withAuth(contractNoteController.remove),
);

export { router as contractRouter };
