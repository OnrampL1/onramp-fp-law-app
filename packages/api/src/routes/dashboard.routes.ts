import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { authenticate, withAuth } from "../middleware/authenticate";

const router = Router();

router.get("/summary", authenticate, withAuth(dashboardController.summary));

export { router as dashboardRouter };
