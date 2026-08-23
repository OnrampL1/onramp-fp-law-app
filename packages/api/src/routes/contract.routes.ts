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
  deleteContractSchema,
  listContractsQuerySchema,
  setContractLegalStateSchema,
  updateContractContentSchema,
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
  "/:id/file",
  authenticate,
  validate(contractIdParamSchema, "params"),
  withAuth(contractController.getFile),
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

// Manual override (Domain & Business Rules: TERMINATED is the sole
// user-settable legal state; every other value is computed from dates by
// the daily sweep / on metadata edit). Narrower than metadata edit's role
// set — Owner/Admin only.
router.put(
  "/:id/legal-state",
  authenticate,
  authorize("OWNER", "ADMIN"),
  validate(contractIdParamSchema, "params"),
  validate(setContractLegalStateSchema, "body"),
  withAuth(contractController.setLegalState),
);

// Extracted-text edit — separate from /:id/metadata (large free-form
// blob vs short structured fields), separate role check isn't needed
// beyond matching metadata edit's existing set. Re-triggers AI analysis
// against the corrected text (see contractService.updateContractContent).
router.put(
  "/:id/content",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  validate(contractIdParamSchema, "params"),
  validate(updateContractContentSchema, "body"),
  withAuth(contractController.updateContent),
);

// Soft delete (Domain & Business Rules: only Owner/Admin, same narrower set
// as the legal-state override — this is at least as sensitive). Version-
// gated like every other contract mutation; the row is filtered out of all
// reads afterward via deletedAt, never physically removed.
router.delete(
  "/:id",
  authenticate,
  authorize("OWNER", "ADMIN"),
  validate(contractIdParamSchema, "params"),
  validate(deleteContractSchema, "body"),
  withAuth(contractController.remove),
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
