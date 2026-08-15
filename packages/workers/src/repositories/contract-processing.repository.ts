import { getPrismaClient, deriveLegalState } from "@starter-kit/shared";
import type { ContractLegalState } from "@prisma/client";

const prisma = getPrismaClient();

export async function markExtractionCompleted(
  contractId: string,
  extractedText: string,
): Promise<{ id: string; organizationId: string; uploadedByUserId: string }> {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.update({
      where: { id: contractId },
      data: {
        extractedText,
        processingStatus: "EXTRACTION_COMPLETED",
        processingError: null,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: contract.organizationId,
        actorType: "SYSTEM",
        action: "CONTRACT_TEXT_EXTRACTED",
        targetEntityType: "Contract",
        targetEntityId: contract.id,
        contractId: contract.id,
        oldValue: { processingStatus: "PENDING_EXTRACTION" },
        newValue: { processingStatus: "EXTRACTION_COMPLETED" },
      },
    });

    return {
      id: contract.id,
      organizationId: contract.organizationId,
      uploadedByUserId: contract.uploadedByUserId,
    };
  });
}

export async function markExtractionFailed(
  contractId: string,
  processingError: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.update({
      where: { id: contractId },
      data: {
        processingStatus: "EXTRACTION_FAILED",
        processingError,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: contract.organizationId,
        actorType: "SYSTEM",
        action: "CONTRACT_PROCESSING_STATUS_CHANGED",
        targetEntityType: "Contract",
        targetEntityId: contract.id,
        contractId: contract.id,
        oldValue: { processingStatus: "PENDING_EXTRACTION" },
        newValue: { processingStatus: "EXTRACTION_FAILED", processingError },
      },
    });
  });
}

const PLACEHOLDER_TITLE = "Untitled Contract";
const PLACEHOLDER_COUNTERPARTY = "Unknown Counterparty";

export interface ExtractedContractMetadata {
  title: string | null;
  counterparty: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  tags: string[];
}

function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Applies AI-extracted metadata to a contract, but only the fields the user
// never provided, and only if nobody has touched the contract since upload
// (version still 1) — the same optimistic-concurrency check
// contractRepository.updateMetadata already uses for user-initiated edits
// in packages/api, reused here rather than reinvented for this
// system-initiated case. Also recomputes legalState in the same write,
// since it depends on the same dates this function may just have set.
export async function applyExtractedMetadata(
  contractId: string,
  extracted: ExtractedContractMetadata,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract || contract.version !== 1) {
      return;
    }

    const nextTitle =
      contract.title === PLACEHOLDER_TITLE && extracted.title
        ? extracted.title
        : contract.title;
    const nextCounterparty =
      contract.counterparty === PLACEHOLDER_COUNTERPARTY &&
      extracted.counterparty
        ? extracted.counterparty
        : contract.counterparty;
    const nextEffectiveDate =
      contract.effectiveDate === null
        ? parseIsoDate(extracted.effectiveDate)
        : contract.effectiveDate;
    const nextExpirationDate =
      contract.expirationDate === null
        ? parseIsoDate(extracted.expirationDate)
        : contract.expirationDate;
    const nextTags =
      contract.tags.length === 0 && extracted.tags.length > 0
        ? extracted.tags
        : contract.tags;
    const nextLegalState: ContractLegalState = deriveLegalState(
      contract.legalState,
      nextEffectiveDate,
      nextExpirationDate,
    );

    const nothingChanged =
      nextTitle === contract.title &&
      nextCounterparty === contract.counterparty &&
      nextEffectiveDate?.getTime() === contract.effectiveDate?.getTime() &&
      nextExpirationDate?.getTime() === contract.expirationDate?.getTime() &&
      nextTags.length === contract.tags.length &&
      nextLegalState === contract.legalState;

    if (nothingChanged) {
      return;
    }

    const result = await tx.contract.updateMany({
      where: { id: contractId, version: 1 },
      data: {
        title: nextTitle,
        counterparty: nextCounterparty,
        effectiveDate: nextEffectiveDate,
        expirationDate: nextExpirationDate,
        tags: nextTags,
        legalState: nextLegalState,
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      return;
    }

    await tx.auditLog.create({
      data: {
        organizationId: contract.organizationId,
        actorType: "SYSTEM",
        action: "CONTRACT_METADATA_UPDATED",
        targetEntityType: "Contract",
        targetEntityId: contractId,
        contractId,
        newValue: {
          title: nextTitle,
          counterparty: nextCounterparty,
          effectiveDate: nextEffectiveDate?.toISOString() ?? null,
          expirationDate: nextExpirationDate?.toISOString() ?? null,
          tags: nextTags,
          legalState: nextLegalState,
          source: "AI_METADATA_EXTRACTION",
        },
      },
    });
  });
}
