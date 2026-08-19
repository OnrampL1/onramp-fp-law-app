import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authenticate, withAuth } from "../middleware/authenticate";

const router = Router();

// No role restriction — every authenticated org member (Owner/Admin/Internal)
// sees notifications, same audience as the bell icon itself.
router.get("/", authenticate, withAuth(notificationController.list));

export { router as notificationRouter };
