import { getPrismaClient } from "@starter-kit/shared";

const prisma = getPrismaClient();

export async function markOrganizationBrainItemExtractionCompleted(
  id: string,
  organizationId: string,
  extractedText: string,
): Promise<void> {
  await prisma.organizationBrainItem.updateMany({
    where: { id, organizationId },
    data: { extractedText, extractionError: null },
  });
}

export async function markOrganizationBrainItemExtractionFailed(
  id: string,
  organizationId: string,
  extractionError: string,
): Promise<void> {
  await prisma.organizationBrainItem.updateMany({
    where: { id, organizationId },
    data: { extractionError },
  });
}
