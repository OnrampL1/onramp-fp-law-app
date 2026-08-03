import { Router } from "express";
import { witnessController } from "../controllers/witness.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ADMIN_ROLES } from "@starter-kit/shared";
import {
  createWitnessLinkSchema,
  listWitnessLinksQuerySchema,
} from "../schemas/witness.schemas";

const router = Router();

router.use(authenticate);

// Matches openapi.yaml's /users/witness-link — kept in its own file/service
// (rather than folded into user.routes.ts) following the same
// domain-per-file convention as invitation.routes.ts.
//
// Listing is Admin/Owner-only too (not open to any authenticated member the
// way GET /invitations and GET /users are) — witness link management is an
// Admin/Owner responsibility per the Business Rules Appendix A actor table,
// same reasoning as GET /contracts/:id/audit being admin-gated.
router.get(
  "/witness-link",
  authorize(...ADMIN_ROLES),
  validate(listWitnessLinksQuerySchema, "query"),
  witnessController.list,
);
router.post(
  "/witness-link",
  authorize(...ADMIN_ROLES),
  validate(createWitnessLinkSchema),
  witnessController.create,
);

// Real aggregate counts backing the Witness Workflow page's KPI cards and
// review-progress funnel (see getWitnessLinkStats) — same Admin/Owner gate
// as the rest of this file. No :id segment, so no route-ordering conflict
// with /witness-link/:id/revoke below.
router.get(
  "/witness-link/stats",
  authorize(...ADMIN_ROLES),
  witnessController.stats,
);

// Mirrors invitation.routes.ts's POST /:id/revoke pattern. isRevoked (not
// status) is what actually gates access, so this remains callable on a
// USED invitation, not just an ISSUED one — see revokeWitnessLink for why.
router.post(
  "/witness-link/:id/revoke",
  authorize(...ADMIN_ROLES),
  witnessController.revoke,
);

// Mirrors invitation.routes.ts's POST /:id/resend pattern — same Admin/Owner
// gate as every other witness-link mutation route in this file.
router.post(
  "/witness-link/:id/resend",
  authorize(...ADMIN_ROLES),
  witnessController.resend,
);

export { router as witnessRouter };
