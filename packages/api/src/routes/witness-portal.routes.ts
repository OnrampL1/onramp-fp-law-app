import { Router } from "express";
import { witnessController } from "../controllers/witness.controller";
import {
  witnessSessionMiddleware,
  withWitnessSession,
} from "../middleware/witness-session.middleware";

const router = Router();

// Separate from witness.routes.ts (admin-gated link creation, mounted under
// /users) and auth.routes.ts (public redemption, mounted under /auth) —
// this is the witness's own read-only view, gated by witnessSessionMiddleware
// rather than authenticate/authorize, since a witness has no User/role.
// No :contractId in the path — there is deliberately nowhere for a client
// to supply one; the single allowed contract always comes from the session.
router.get(
  "/contract",
  witnessSessionMiddleware,
  withWitnessSession(witnessController.getContract),
);

// Streams the contract's source file — separate from /contract (JSON
// metadata) since this response is a binary body, not JSON.
router.get(
  "/contract/file",
  witnessSessionMiddleware,
  withWitnessSession(witnessController.getContractFile),
);

// Streams the owning organization's logo, so the witness portal can brand
// itself as that organization rather than Clausio — same session scoping
// as everything else in this router, resolved through the witness's own
// contractId rather than any organization id the client could supply.
router.get(
  "/organization/logo",
  witnessSessionMiddleware,
  withWitnessSession(witnessController.getOrganizationLogo),
);

export { router as witnessPortalRouter };
