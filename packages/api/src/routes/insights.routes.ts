import { Router } from "express";
import { insightsController } from "../controllers/insights.controller";
import { authenticate, withAuth } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  insightCategoryContractsQuerySchema,
  insightCategoryParamSchema,
} from "../schemas/insights.schemas";

const router = Router();

router.get("/summary", authenticate, withAuth(insightsController.summary));

router.get(
  "/:category/contracts",
  authenticate,
  validate(insightCategoryParamSchema, "params"),
  validate(insightCategoryContractsQuerySchema, "query"),
  withAuth(insightsController.contractsByCategory),
);

export { router as insightsRouter };
