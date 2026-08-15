import { Router } from "express";
import { platformOrganizationController } from "../controllers/platform-organization.controller";
import { authenticatePlatform } from "../middleware/authenticate-platform";
import { authorizePlatform } from "../middleware/authorize-platform";
import { validate } from "../middleware/validate";
import {
  listPlatformOrganizationsQuerySchema,
  platformOrganizationParamsSchema,
} from "../schemas/platform-organization.schemas";

const router = Router();

router.use(authenticatePlatform);
router.use(authorizePlatform());

router.get(
  "/",
  validate(listPlatformOrganizationsQuerySchema, "query"),
  platformOrganizationController.list,
);

router.get(
  "/:id",
  validate(platformOrganizationParamsSchema, "params"),
  platformOrganizationController.getById,
);

export { router as platformOrganizationRouter };
