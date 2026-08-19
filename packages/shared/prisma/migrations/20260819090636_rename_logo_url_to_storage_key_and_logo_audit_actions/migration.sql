-- RenameColumn
ALTER TABLE "organization_settings" RENAME COLUMN "logo_url" TO "logo_storage_key";

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_LOGO_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_LOGO_DELETED';
