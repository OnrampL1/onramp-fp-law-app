import type { Request, Response, NextFunction } from "express";
import { organizationBrainService } from "../services/organization-brain.service";
import {
  createOrganizationBrainUploadSchema,
  type ListOrganizationBrainItemsQuery,
  type OrganizationBrainItemIdParam,
} from "../schemas/organization-brain.schemas";

function requestContextFrom(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

function actorFrom(req: Request) {
  return {
    userId: req.user!.userId,
    organizationId: req.user!.orgId,
  };
}

async function createFromUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const metadataResult = createOrganizationBrainUploadSchema.safeParse(
      req.body,
    );

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

    const item = await organizationBrainService.createFromUpload({
      metadata: metadataResult.data,
      file: req.file,
      actor: actorFrom(req),
      requestContext: requestContextFrom(req),
    });

    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
}

async function createFromPaste(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await organizationBrainService.createFromPaste({
      input: req.body,
      actor: actorFrom(req),
      requestContext: requestContextFrom(req),
    });

    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
}

async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListOrganizationBrainItemsQuery;

    const result = await organizationBrainService.listItems(
      req.user!.orgId,
      {
        type: query.type,
        search: query.search,
      },
      {
        page: query.page,
        pageSize: query.pageSize,
      },
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as OrganizationBrainItemIdParam;

    const item = await organizationBrainService.getById(id, req.user!.orgId);

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
}

async function deleteById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as OrganizationBrainItemIdParam;

    await organizationBrainService.deleteById(
      id,
      actorFrom(req),
      requestContextFrom(req),
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export const organizationBrainController = {
  createFromUpload,
  createFromPaste,
  list,
  getById,
  deleteById,
};
