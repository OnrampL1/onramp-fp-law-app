import { Router } from "express";
import { authRouter } from "./auth.routes";
import { contractsRouter } from "./contracts.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/contracts", contractsRouter);

// Add more routers here:
// router.use('/users', usersRouter);

export { router };
