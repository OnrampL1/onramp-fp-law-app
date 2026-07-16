import { Router } from "express";
import { invitationController } from "../controllers/invitation.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ADMIN_ROLES } from "@starter-kit/shared";
import {
  createInvitationSchema,
  listInvitationsQuerySchema,
} from "../schemas/invitation.schemas";

const router = Router();

router.use(authenticate);

// Viewing pending invitations is available to any authenticated org member,
// matching GET /users; creating/resending them is admin-only.
router.get(
  "/",
  validate(listInvitationsQuerySchema, "query"),
  invitationController.list,
);

router.post(
  "/",
  authorize(...ADMIN_ROLES),
  validate(createInvitationSchema),
  invitationController.create,
);
router.post(
  "/:id/resend",
  authorize(...ADMIN_ROLES),
  invitationController.resend,
);

export { router as invitationRouter };
