import type { Request, Response, NextFunction } from "express";
import { contractsService } from "../services/contracts.service";
import { createContractMetadataSchema } from "../schemas/contracts.schemas";

export const contractsController = {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metadataResult = createContractMetadataSchema.safeParse(req.body);

      if (!metadataResult.success) {
        res.status(422).json({
          error: "Validation failed",
          errors: metadataResult.error.errors.map((error) => ({
            field: error.path.join("."),
            message: error.message,
          })),
        });
        return;
      }

      const contract = await contractsService.uploadContract({
        metadata: metadataResult.data,
        file: req.file,
        actor: {
          userId: req.user!.userId,
          organizationId: req.user!.orgId,
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      });

      res.status(201).json({
        data: {
          id: contract.id,
          title: contract.title,
          counterparty: contract.counterparty,
          businessStatus: contract.businessStatus,
          processingStatus: contract.processingStatus,
          legalState: contract.legalState,
          tags: contract.tags,
          expirationDate: contract.expirationDate,
          version: contract.version,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
