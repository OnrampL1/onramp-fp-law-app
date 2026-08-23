import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { contractService } from "../services/contract.service";
import { createContractMetadataSchema } from "../schemas/contract.schemas";
import type {
  ContractIdParam,
  DeleteContractInput,
  ListContractsQuery,
  UpdateContractContentInput,
  UpdateContractMetadataInput,
  SetContractLegalStateInput,
} from "../schemas/contract.schemas";

async function upload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

    const contract = await contractService.uploadContract({
      metadata: metadataResult.data,
      file: req.file,
      actor: {
        userId: req.user.userId,
        organizationId: req.user.orgId,
      },
      requestContext: {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    res.status(201).json({ data: contract });
  } catch (error) {
    next(error);
  }
}

async function updateMetadata(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as ContractIdParam;
    const input = req.body as UpdateContractMetadataInput;

    const contract = await contractService.updateContractMetadata(
      id,
      input,
      {
        userId: req.user.userId,
        organizationId: req.user.orgId,
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    );

    res.json({ data: contract });
  } catch (error) {
    next(error);
  }
}

async function setLegalState(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as ContractIdParam;
    const input = req.body as SetContractLegalStateInput;

    const contract = await contractService.setContractLegalState(
      id,
      input,
      {
        userId: req.user.userId,
        organizationId: req.user.orgId,
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    );

    res.json({ data: contract });
  } catch (error) {
    next(error);
  }
}

async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as ContractIdParam;
    const input = req.body as DeleteContractInput;

    await contractService.deleteContract(
      id,
      input,
      {
        userId: req.user.userId,
        organizationId: req.user.orgId,
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function updateContent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as ContractIdParam;
    const input = req.body as UpdateContractContentInput;

    const content = await contractService.updateContractContent(
      id,
      input,
      {
        userId: req.user.userId,
        organizationId: req.user.orgId,
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    );

    res.json({ data: content });
  } catch (error) {
    next(error);
  }
}

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

async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as ContractIdParam;
    const organizationId = req.user.orgId;

    const contract = await contractService.getContractById(id, organizationId);

    res.json({ data: contract });
  } catch (error) {
    next(error);
  }
}

async function getFile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as ContractIdParam;
    const organizationId = req.user.orgId;

    const file = await contractService.getContractFileStream(
      id,
      organizationId,
    );

    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.fileName}"`,
    );
    if (file.contentLength !== undefined) {
      res.setHeader("Content-Length", file.contentLength);
    }

    file.body.on("error", (err) => {
      // Headers (and possibly some bytes) may already be on the wire by the
      // time S3 errors mid-stream — the error-handler middleware always
      // calls res.status().json(), which throws once headers are sent, so
      // route that case to destroying the connection instead of next().
      if (res.headersSent) {
        res.destroy(err);
        return;
      }
      next(err);
    });
    file.body.pipe(res);
  } catch (error) {
    next(error);
  }
}

async function getContent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as ContractIdParam;
    const organizationId = req.user.orgId;

    const content = await contractService.getContractContent(
      id,
      organizationId,
    );

    res.json({ data: content });
  } catch (error) {
    next(error);
  }
}

export const contractController = {
  upload,
  updateMetadata,
  setLegalState,
  remove,
  updateContent,
  list,
  getById,
  getFile,
  getContent,
};
