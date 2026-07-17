import { Router } from "express";
import { authRouter } from "./auth.routes";
import { contractRouter } from "./contract.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/contracts", contractRouter);

// Add more routers here:
// router.use('/users', usersRouter);

export { router };
