import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { invitationRouter } from "./invitation.routes";
import { contractsRouter } from "./contracts.routes";
import { contractRouter } from "./contract.routes";
import { organizationRouter } from "./organization.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/invitations", invitationRouter);
router.use("/contracts", contractsRouter);
router.use("/contracts", contractRouter);
router.use("/organizations", organizationRouter);

// Add more routers here:
// router.use('/users', usersRouter);

export { router };
