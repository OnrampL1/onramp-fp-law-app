import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { witnessController } from "../controllers/witness.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authRateLimiter, witnessRateLimiter } from "../middleware/rate-limiter";
import {
  acceptInvitationSchema,
  changePasswordSchema,
  loginSchema,
} from "../schemas/auth.schemas";

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
router.post(
  "/change-password",
  authenticate,
  authRateLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

// Public, no `authenticate` — a witness has no account (BR-4). Rate-limited
// the same as login/accept-invitation since a token path param is an
// unauthenticated guessing surface.
router.post("/witness/:token", witnessRateLimiter, witnessController.redeem);

export { router as authRouter };
