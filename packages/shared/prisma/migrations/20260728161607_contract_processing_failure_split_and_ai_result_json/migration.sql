/*
  Warnings:

  - The values [FAILED] on the enum `ContractProcessingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `response` on the `ai_analyses` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContractProcessingStatus_new" AS ENUM ('PENDING_EXTRACTION', 'EXTRACTION_COMPLETED', 'EXTRACTION_FAILED', 'AI_PENDING', 'AI_COMPLETED', 'AI_FAILED');
ALTER TABLE "public"."contracts" ALTER COLUMN "processing_status" DROP DEFAULT;
ALTER TABLE "contracts" ALTER COLUMN "processing_status" TYPE "ContractProcessingStatus_new" USING ("processing_status"::text::"ContractProcessingStatus_new");
ALTER TYPE "ContractProcessingStatus" RENAME TO "ContractProcessingStatus_old";
ALTER TYPE "ContractProcessingStatus_new" RENAME TO "ContractProcessingStatus";
DROP TYPE "public"."ContractProcessingStatus_old";
ALTER TABLE "contracts" ALTER COLUMN "processing_status" SET DEFAULT 'PENDING_EXTRACTION';
COMMIT;

-- AlterTable
ALTER TABLE "ai_analyses" DROP COLUMN "response",
ADD COLUMN     "result" JSONB;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "processing_error" TEXT;
