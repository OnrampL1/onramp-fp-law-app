import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ADMIN_ROLES } from "@starter-kit/shared";
import {
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "../schemas/user.schemas";

const router = Router();

router.use(authenticate);

// Viewing the roster is available to any authenticated org member (non-admins
// can "view team members and permissions"); only the mutating actions below
// are admin-only.
router.get("/", validate(listUsersQuerySchema, "query"), userController.list);

router.put(
  "/:id/role",
  authorize(...ADMIN_ROLES),
  validate(updateUserRoleSchema),
  userController.updateRole,
);
router.put(
  "/:id/status",
  authorize(...ADMIN_ROLES),
  validate(updateUserStatusSchema),
  userController.updateStatus,
);

export { router as userRouter };
