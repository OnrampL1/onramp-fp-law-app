import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { contractNoteService } from "../services/contract-note.service";
import type { ContractIdParam } from "../schemas/contract.schemas";
import type {
  ContractNoteIdParam,
  ListContractNotesQuery,
  CreateContractNoteInput,
  UpdateContractNoteInput,
} from "../schemas/contract-note.schemas";

function requestContextFrom(req: AuthenticatedRequest) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

function actorFrom(req: AuthenticatedRequest) {
  return {
    userId: req.user.userId,
    organizationId: req.user.orgId,
    role: req.user.role,
  };
}

async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId } = req.params as unknown as ContractIdParam;
    const { page, pageSize } = req.query as unknown as ListContractNotesQuery;

    const result = await contractNoteService.listNotes(
      contractId,
      req.user.orgId,
      { page, pageSize },
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId } = req.params as unknown as ContractIdParam;
    const { content } = req.body as CreateContractNoteInput;

    const note = await contractNoteService.createNote(
      contractId,
      content,
      actorFrom(req),
      requestContextFrom(req),
    );

    res.status(201).json({ data: note });
  } catch (error) {
    next(error);
  }
}

async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId, noteId } =
      req.params as unknown as ContractNoteIdParam;
    const { content } = req.body as UpdateContractNoteInput;

    const note = await contractNoteService.updateNote(
      noteId,
      contractId,
      content,
      actorFrom(req),
      requestContextFrom(req),
    );

    res.json({ data: note });
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
    const { id: contractId, noteId } =
      req.params as unknown as ContractNoteIdParam;

    await contractNoteService.deleteNote(
      noteId,
      contractId,
      actorFrom(req),
      requestContextFrom(req),
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export const contractNoteController = {
  list,
  create,
  update,
  remove,
};
