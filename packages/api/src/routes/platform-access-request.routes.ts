import { Router } from "express";
import { platformAccessRequestController } from "../controllers/platform-access-request.controller";
import { authenticatePlatform } from "../middleware/authenticate-platform";
import { authorizePlatform } from "../middleware/authorize-platform";
import { validate } from "../middleware/validate";
import {
  accessRequestParamsSchema,
  listAccessRequestsQuerySchema,
  approveAccessRequestSchema,
  declineAccessRequestSchema,
} from "../schemas/access-request.schemas";
import { PLATFORM_SUPER_ADMIN_ROLES } from "@starter-kit/shared";

const router = Router();

router.use(authenticatePlatform);
router.use(authorizePlatform());

router.get(
  "/",
  validate(listAccessRequestsQuerySchema, "query"),
  platformAccessRequestController.list,
);

router.post(
  "/:id/approve",
  authorizePlatform(...PLATFORM_SUPER_ADMIN_ROLES),
  validate(accessRequestParamsSchema, "params"),
  validate(approveAccessRequestSchema),
  platformAccessRequestController.approve,
);

router.post(
  "/:id/decline",
  authorizePlatform(...PLATFORM_SUPER_ADMIN_ROLES),
  validate(accessRequestParamsSchema, "params"),
  validate(declineAccessRequestSchema),
  platformAccessRequestController.decline,
);

router.get(
  "/:id",
  validate(accessRequestParamsSchema, "params"),
  platformAccessRequestController.getById,
);

export { router as platformAccessRequestRouter };
