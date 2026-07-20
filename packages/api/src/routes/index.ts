import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { invitationRouter } from "./invitation.routes";
import { contractsRouter } from "./contracts.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/invitations", invitationRouter);
router.use("/contracts", contractsRouter);

// Add more routers here:
// router.use('/users', usersRouter);

export { router };
