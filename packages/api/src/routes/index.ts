import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { invitationRouter } from "./invitation.routes";
import { contractRouter } from "./contract.routes";
import { organizationRouter } from "./organization.routes";
import { settingsRouter } from "./settings.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/invitations", invitationRouter);
router.use("/contracts", contractRouter);
router.use("/organizations", organizationRouter);
router.use("/settings", settingsRouter);

export { router };
