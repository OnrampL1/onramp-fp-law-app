import type { Request, Response, NextFunction } from "express";
import { searchService } from "../services/search.service";
import type { SearchQuery } from "../schemas/search.schemas";

export const searchController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q } = req.query as unknown as SearchQuery;
      const data = await searchService.search(req.user!.orgId, q);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
};
