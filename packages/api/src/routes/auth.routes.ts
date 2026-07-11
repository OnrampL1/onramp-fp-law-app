import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authRateLimiter } from "../middleware/rate-limiter";
import { acceptInvitationSchema, loginSchema } from "../schemas/auth.schemas";

const router = Router();

// Clausio has no public self-registration (BR-3/BR-17) — membership is
// always granted through an Invitation. This replaces the old open
// "register" endpoint with the approved accept-invitation flow.
router.post(
  "/accept-invitation",
  authRateLimiter,
  validate(acceptInvitationSchema),
  authController.acceptInvitation,
);
router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login,
);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

export { router as authRouter };
