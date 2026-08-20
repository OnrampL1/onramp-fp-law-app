import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authenticate, withAuth } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  listNotificationsQuerySchema,
  updateNotificationPreferencesSchema,
} from "../schemas/notification.schemas";

const router = Router();

router.use(authenticate);

// No role restriction — every authenticated org member (Owner/Admin/Internal)
// sees their own notifications, same audience as the bell icon itself.
router.get(
  "/",
  validate(listNotificationsQuerySchema, "query"),
  withAuth(notificationController.list),
);

// Personal preferences are self-service — every user manages their own, no
// admin gate (that gate lives on OrganizationSettings.notificationPreferences
// via PUT /settings/organization instead).
router.get("/preferences", withAuth(notificationController.getPreferences));
router.put(
  "/preferences",
  validate(updateNotificationPreferencesSchema),
  withAuth(notificationController.updatePreferences),
);

router.post("/read-all", withAuth(notificationController.markAllRead));
router.post("/:id/read", withAuth(notificationController.markRead));

export { router as notificationRouter };
