import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { assistantController } from "../controllers/assistant.controller";
import { askAssistantBodySchema } from "../schemas/assistant.schemas";

const router = Router();

router.use(authenticate);

// No authorize(...ADMIN_ROLES): the Assistant only ever reads through the
// same tools an authenticated user could already reach directly (contract
// search/analysis/investigator, Organization Brain ask, Legal KB ask) -
// there's no additional write surface here to admin-gate, same reasoning
// as legal-kb.routes.ts.
router.post(
  "/ask",
  validate(askAssistantBodySchema, "body"),
  assistantController.ask,
);

export { router as assistantRouter };
