import type {
  Contract,
  ContractLegalState,
  ContractProcessingStatus,
  Prisma,
} from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { auditService } from "../services/audit.service";

const prisma = getPrismaClient();

export interface CreateUploadedContractInput {
  organizationId: string;
  uploadedByUserId: string;
  title: string;
  counterparty: string;
  tags: string[];
  expirationDate: Date | null;
  legalState?: ContractLegalState;
  fileKey: string;
  fileChecksum: string;
  extractedText: string | null;
  processingStatus: ContractProcessingStatus;
  ipAddress?: string;
  userAgent?: string;
}

export class ContractsRepository {
  async createUploadedContract(
    input: CreateUploadedContractInput,
  ): Promise<Contract> {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          organizationId: input.organizationId,
          uploadedByUserId: input.uploadedByUserId,
          title: input.title,
          counterparty: input.counterparty,
          tags: input.tags,
          expirationDate: input.expirationDate,
          legalState: input.legalState,
          fileKey: input.fileKey,
          fileChecksum: input.fileChecksum,
          extractedText: input.extractedText,
          processingStatus: input.processingStatus,
        },
      });

      await this.createContractUploadedAuditLog(tx, contract, input);

      return contract;
    });
  }

  private async createContractUploadedAuditLog(
    tx: Prisma.TransactionClient,
    contract: Contract,
    input: CreateUploadedContractInput,
  ): Promise<void> {
    await auditService.logEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.uploadedByUserId,
      action: "CONTRACT_UPLOADED",
      targetEntityType: "Contract",
      targetEntityId: contract.id,
      contractId: contract.id,
      newValue: {
        title: contract.title,
        counterparty: contract.counterparty,
        tags: contract.tags,
        expirationDate: contract.expirationDate?.toISOString() ?? null,
        legalState: contract.legalState,
        businessStatus: contract.businessStatus,
        processingStatus: contract.processingStatus,
        version: contract.version,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }
}

export const contractsRepository = new ContractsRepository();
