import { Router } from "express";
import { onboardingController } from "../controllers/onboarding.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { completeOrganizationOnboardingSchema } from "../schemas/onboarding.schemas";

const router = Router();

router.use(authenticate);

router.get("/organization", onboardingController.getOrganizationOnboarding);

router.post(
  "/organization/complete",
  validate(completeOrganizationOnboardingSchema),
  onboardingController.completeOrganizationOnboarding,
);

export { router as onboardingRouter };
