import { Router } from "express";
import { ADMIN_ROLES } from "@starter-kit/shared";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { parseOrganizationLogoUploadFile } from "../middleware/organization-logo-upload.middleware";
import { settingsController } from "../controllers/settings.controller";
import { updateOrganizationSettingsSchema } from "../schemas/settings.schemas";

const router = Router();

router.use(authenticate);

router.get("/organization", settingsController.getOrganizationSettings);

router.put(
  "/organization",
  authorize(...ADMIN_ROLES),
  validate(updateOrganizationSettingsSchema),
  settingsController.updateOrganizationSettings,
);

router.post(
  "/organization/logo",
  authorize(...ADMIN_ROLES),
  parseOrganizationLogoUploadFile,
  settingsController.uploadOrganizationLogo,
);

router.delete(
  "/organization/logo",
  authorize(...ADMIN_ROLES),
  settingsController.deleteOrganizationLogo,
);

export { router as settingsRouter };
