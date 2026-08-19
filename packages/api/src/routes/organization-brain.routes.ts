import { Router } from "express";
import { ADMIN_ROLES } from "@starter-kit/shared";
import { organizationBrainController } from "../controllers/organization-brain.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { parseOrganizationBrainUploadFile } from "../middleware/organization-brain-upload.middleware";
import {
  createOrganizationBrainPasteSchema,
  listOrganizationBrainItemsQuerySchema,
  organizationBrainItemIdParamSchema,
} from "../schemas/organization-brain.schemas";
import { organizationBrainInvestigatorController } from "../controllers/organization-brain-investigator.controller";
import { askOrganizationBrainBodySchema } from "../schemas/organization-brain-investigator.schemas";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validate(listOrganizationBrainItemsQuerySchema, "query"),
  organizationBrainController.list,
);

router.post(
  "/ask",
  validate(askOrganizationBrainBodySchema, "body"),
  organizationBrainInvestigatorController.ask,
);

router.post(
  "/upload",
  authorize(...ADMIN_ROLES),
  parseOrganizationBrainUploadFile,
  organizationBrainController.createFromUpload,
);

router.post(
  "/paste",
  authorize(...ADMIN_ROLES),
  validate(createOrganizationBrainPasteSchema),
  organizationBrainController.createFromPaste,
);

router.get(
  "/:id",
  validate(organizationBrainItemIdParamSchema, "params"),
  organizationBrainController.getById,
);

router.delete(
  "/:id",
  authorize(...ADMIN_ROLES),
  validate(organizationBrainItemIdParamSchema, "params"),
  organizationBrainController.deleteById,
);

export { router as organizationBrainRouter };
