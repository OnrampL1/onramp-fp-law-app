import { Router } from "express";
import { contractController } from "../controllers/contract.controller";
import { authenticate, withAuth } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { listContractsQuerySchema } from "../schemas/contract.schemas";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(listContractsQuerySchema, "query"),
  withAuth(contractController.list),
);

export { router as contractRouter };
