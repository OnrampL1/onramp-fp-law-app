import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { parseContractUploadFile } from "../middleware/contract-upload.middleware";
import { contractsController } from "../controllers/contracts.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("OWNER", "ADMIN", "INTERNAL"),
  parseContractUploadFile,
  contractsController.upload,
);

export { router as contractsRouter };
