import { contractRepository } from "../repositories/contract.repository";
import { createError } from "../middleware/error-handler";
import {
  contractNoteRepository,
  type ContractNoteRow,
} from "../repositories/contract-note.repository";
import type {
  ContractNoteDto,
  ContractNoteListPagination,
  ContractNoteListPaginationMeta,
} from "../types/contract-note.types";

export interface ContractNoteActor {
  userId: string;
  organizationId: string;
  role: string;
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

function toDto(row: ContractNoteRow): ContractNoteDto {
  return {
    id: row.id,
    contractId: row.contractId,
    content: row.content,
    authorId: row.authorId,
    authorName: row.author.fullName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listNotes(
  contractId: string,
  organizationId: string,
  pagination: ContractNoteListPagination,
): Promise<{
  items: ContractNoteDto[];
  pagination: ContractNoteListPaginationMeta;
}> {
  const [rows, total] = await Promise.all([
    contractNoteRepository.findMany(contractId, organizationId, pagination),
    contractNoteRepository.count(contractId, organizationId),
  ]);

  return {
    items: rows.map(toDto),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

async function createNote(
  contractId: string,
  content: string,
  actor: ContractNoteActor,
  requestContext: RequestContext,
): Promise<ContractNoteDto> {
  // ContractNote has no organizationId of its own — this existence check is
  // the only thing preventing a note being created against a contractId
  // belonging to a different organization.
  const contract = await contractRepository.findById(
    contractId,
    actor.organizationId,
  );

  if (!contract) {
    throw createError("Contract not found", 404);
  }

  const note = await contractNoteRepository.create(
    contractId,
    actor.userId,
    content,
    {
      action: "NOTE_ADDED",
      actorType: "USER",
      actorUserId: actor.userId,
      organizationId: actor.organizationId,
      newValue: { content },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    },
  );

  return toDto(note);
}

async function updateNote(
  id: string,
  contractId: string,
  content: string,
  actor: ContractNoteActor,
  requestContext: RequestContext,
): Promise<ContractNoteDto> {
  const existing = await contractNoteRepository.findById(
    id,
    contractId,
    actor.organizationId,
  );

  if (!existing) {
    throw createError("Note not found", 404);
  }

  if (existing.authorId !== actor.userId) {
    throw createError("Only the author can edit this note", 403);
  }

  const updated = await contractNoteRepository.update(
    id,
    contractId,
    actor.organizationId,
    content,
    {
      action: "NOTE_EDITED",
      actorType: "USER",
      actorUserId: actor.userId,
      organizationId: actor.organizationId,
      oldValue: { content: existing.content },
      newValue: { content },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    },
  );

  if (!updated) {
    throw createError("Note not found", 404);
  }

  return toDto(updated);
}

async function deleteNote(
  id: string,
  contractId: string,
  actor: ContractNoteActor,
  requestContext: RequestContext,
): Promise<void> {
  const existing = await contractNoteRepository.findById(
    id,
    contractId,
    actor.organizationId,
  );

  if (!existing) {
    throw createError("Note not found", 404);
  }

  const isAuthor = existing.authorId === actor.userId;
  const isAdmin = actor.role === "OWNER" || actor.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    throw createError(
      "Only the author or an organization admin can delete this note",
      403,
    );
  }

  const deleted = await contractNoteRepository.softDelete(
    id,
    contractId,
    actor.organizationId,
    {
      action: "NOTE_DELETED",
      actorType: "USER",
      actorUserId: actor.userId,
      organizationId: actor.organizationId,
      oldValue: { content: existing.content },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    },
  );

  if (!deleted) {
    throw createError("Note not found", 404);
  }
}

export const contractNoteService = {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
};
