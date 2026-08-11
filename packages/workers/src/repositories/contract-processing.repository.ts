import { getPrismaClient } from "@starter-kit/shared";

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
