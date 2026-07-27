import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { settingsController } from "../controllers/settings.controller";

const router = Router();

router.use(authenticate);

router.get("/organization", settingsController.getOrganizationSettings);

export { router as settingsRouter };
