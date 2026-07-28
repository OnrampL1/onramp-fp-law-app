import { Router } from "express";
import { contractController } from "../controllers/contract.controller";
import { authenticate, withAuth } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { parseContractUploadFile } from "../middleware/contract-upload.middleware";
import { listContractsQuerySchema } from "../schemas/contract.schemas";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  parseContractUploadFile,
  withAuth(contractController.upload),
);

router.get(
  "/",
  authenticate,
  validate(listContractsQuerySchema, "query"),
  withAuth(contractController.list),
);

export { router as contractRouter };
