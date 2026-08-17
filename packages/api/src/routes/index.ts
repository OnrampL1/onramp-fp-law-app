import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { invitationRouter } from "./invitation.routes";
import { contractRouter } from "./contract.routes";
import { organizationRouter } from "./organization.routes";
import { settingsRouter } from "./settings.routes";
import { witnessRouter } from "./witness.routes";
import { witnessPortalRouter } from "./witness-portal.routes";
import { notificationRouter } from "./notification.routes";
import { organizationBrainRouter } from "./organization-brain.routes";
import { legalKbRouter } from "./legal-kb.routes";
import { dashboardRouter } from "./dashboard.routes";
import { platformAuthRouter } from "./platform-auth.routes";
import { platformOrganizationRouter } from "./platform-organization.routes";
import { searchRouter } from "./search.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/platform/auth", platformAuthRouter);
router.use("/platform/organizations", platformOrganizationRouter);
router.use("/users", userRouter);
router.use("/users", witnessRouter);
router.use("/invitations", invitationRouter);
router.use("/contracts", contractRouter);
router.use("/dashboard", dashboardRouter);
router.use("/organization-brain", organizationBrainRouter);
router.use("/legal-kb", legalKbRouter);
router.use("/organizations", organizationRouter);
router.use("/settings", settingsRouter);
router.use("/witness", witnessPortalRouter);
router.use("/notifications", notificationRouter);
router.use("/search", searchRouter);

export { router };
