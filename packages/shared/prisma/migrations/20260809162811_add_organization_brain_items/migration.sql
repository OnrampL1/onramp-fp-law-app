-- CreateEnum
CREATE TYPE "OrganizationBrainItemType" AS ENUM ('TEMPLATE', 'POLICY', 'CLAUSE', 'GUIDELINE');

-- CreateEnum
CREATE TYPE "OrganizationBrainItemSource" AS ENUM ('UPLOAD', 'PASTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_BRAIN_ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_BRAIN_ITEM_DELETED';

-- CreateTable
CREATE TABLE "organization_brain_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "OrganizationBrainItemType" NOT NULL,
    "source" "OrganizationBrainItemSource" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_brain_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_brain_items_organization_id_type_idx" ON "organization_brain_items"("organization_id", "type");

-- CreateIndex
CREATE INDEX "organization_brain_items_organization_id_created_at_idx" ON "organization_brain_items"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "organization_brain_items_organization_id_title_idx" ON "organization_brain_items"("organization_id", "title");

-- AddForeignKey
ALTER TABLE "organization_brain_items" ADD CONSTRAINT "organization_brain_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_brain_items" ADD CONSTRAINT "organization_brain_items_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
