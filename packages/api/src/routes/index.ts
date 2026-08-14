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

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/users", witnessRouter);
router.use("/invitations", invitationRouter);
router.use("/contracts", contractRouter);
router.use("/organization-brain", organizationBrainRouter);
router.use("/legal-kb", legalKbRouter);
router.use("/organizations", organizationRouter);
router.use("/settings", settingsRouter);
router.use("/witness", witnessPortalRouter);
router.use("/notifications", notificationRouter);

export { router };
