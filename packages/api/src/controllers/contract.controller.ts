import type { Response, NextFunction } from "express";
import type { ListContractsQuery } from "../schemas/contract.schemas";
import type { AuthenticatedRequest } from "../types/express.types";
import { contractService } from "../services/contract.service";

async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { filters, sort, pagination } =
      req.query as unknown as ListContractsQuery;
    const organizationId = req.user.orgId;

    const result = await contractService.listContracts(
      organizationId,
      filters,
      sort,
      pagination,
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export const contractController = {
  list,
};
