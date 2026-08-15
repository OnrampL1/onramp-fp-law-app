import { Router } from "express";
import { platformOrganizationController } from "../controllers/platform-organization.controller";
import { authenticatePlatform } from "../middleware/authenticate-platform";
import { authorizePlatform } from "../middleware/authorize-platform";
import { validate } from "../middleware/validate";
import {
  assignPlatformOrganizationOwnerSchema,
  createPlatformOrganizationSchema,
  listPlatformOrganizationsQuerySchema,
  platformOrganizationParamsSchema,
} from "../schemas/platform-organization.schemas";
import { PLATFORM_SUPER_ADMIN_ROLES } from "@starter-kit/shared";

const router = Router();

router.use(authenticatePlatform);
router.use(authorizePlatform());

router.post(
  "/",
  authorizePlatform(...PLATFORM_SUPER_ADMIN_ROLES),
  validate(createPlatformOrganizationSchema),
  platformOrganizationController.create,
);

router.get(
  "/",
  validate(listPlatformOrganizationsQuerySchema, "query"),
  platformOrganizationController.list,
);

router.post(
  "/:id/owner",
  authorizePlatform(...PLATFORM_SUPER_ADMIN_ROLES),
  validate(platformOrganizationParamsSchema, "params"),
  validate(assignPlatformOrganizationOwnerSchema),
  platformOrganizationController.assignFirstOwner,
);

router.get(
  "/:id",
  validate(platformOrganizationParamsSchema, "params"),
  platformOrganizationController.getById,
);

export { router as platformOrganizationRouter };
