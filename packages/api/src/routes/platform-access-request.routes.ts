import { Router } from "express";
import { platformAccessRequestController } from "../controllers/platform-access-request.controller";
import { authenticatePlatform } from "../middleware/authenticate-platform";
import { authorizePlatform } from "../middleware/authorize-platform";
import { validate } from "../middleware/validate";
import {
  accessRequestParamsSchema,
  listAccessRequestsQuerySchema,
} from "../schemas/access-request.schemas";

const router = Router();

router.use(authenticatePlatform);
router.use(authorizePlatform());

router.get(
  "/",
  validate(listAccessRequestsQuerySchema, "query"),
  platformAccessRequestController.list,
);

router.get(
  "/:id",
  validate(accessRequestParamsSchema, "params"),
  platformAccessRequestController.getById,
);

export { router as platformAccessRequestRouter };
