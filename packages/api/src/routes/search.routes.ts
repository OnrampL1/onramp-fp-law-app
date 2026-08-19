import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { searchQuerySchema } from "../schemas/search.schemas";

const router = Router();

router.use(authenticate);

// Same visibility as GET /users and GET /contracts — every authenticated
// org member can search, not just admins; each source query is already
// scoped to req.user.orgId.
router.get("/", validate(searchQuerySchema, "query"), searchController.search);

export { router as searchRouter };
