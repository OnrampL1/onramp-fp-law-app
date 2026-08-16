import { Router } from "express";
import { platformAuthController } from "../controllers/platform-auth.controller";
import { authenticatePlatform } from "../middleware/authenticate-platform";
import { authRateLimiter } from "../middleware/rate-limiter";
import { validate } from "../middleware/validate";
import { platformLoginSchema } from "../schemas/platform-auth.schemas";

const router = Router();

router.post(
  "/login",
  authRateLimiter,
  validate(platformLoginSchema),
  platformAuthController.login,
);

router.post("/refresh", platformAuthController.refresh);
router.post("/logout", authenticatePlatform, platformAuthController.logout);
router.get("/me", authenticatePlatform, platformAuthController.me);

export { router as platformAuthRouter };
