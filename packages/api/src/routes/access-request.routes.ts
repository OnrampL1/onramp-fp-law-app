import { Router } from "express";
import { accessRequestController } from "../controllers/access-request.controller";
import { accessRequestRateLimiter } from "../middleware/rate-limiter";
import { validate } from "../middleware/validate";
import { submitAccessRequestSchema } from "../schemas/access-request.schemas";

const router = Router();

router.post(
  "/",
  accessRequestRateLimiter,
  validate(submitAccessRequestSchema),
  accessRequestController.submit,
);

export { router as accessRequestRouter };
