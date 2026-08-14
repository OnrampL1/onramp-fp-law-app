import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { legalKbInvestigatorController } from "../controllers/legal-kb-investigator.controller";
import { askLegalKbBodySchema } from "../schemas/legal-kb-investigator.schemas";

const router = Router();

router.use(authenticate);

// No authorize(...ADMIN_ROLES) anywhere in this router: unlike Organization
// Brain (which has org-scoped upload/paste/delete), the Legal Knowledge
// Base is a read-only, globally-shared, platform-ingested corpus — there is
// no per-organization write surface here to admin-gate. Any authenticated
// user can ask.
router.post(
  "/ask",
  validate(askLegalKbBodySchema, "body"),
  legalKbInvestigatorController.ask,
);

export { router as legalKbRouter };
