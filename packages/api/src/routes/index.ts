import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { invitationRouter } from "./invitation.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/invitations", invitationRouter);

export { router };
