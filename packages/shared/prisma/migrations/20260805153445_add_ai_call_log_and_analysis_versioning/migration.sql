-- CreateEnum
CREATE TYPE "AICallStatus" AS ENUM ('SUCCESS', 'VALIDATION_FAILED', 'PROVIDER_ERROR');

-- AlterTable
ALTER TABLE "ai_analyses" ADD COLUMN     "prompt_version" TEXT,
ADD COLUMN     "schema_version" TEXT;

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_id" TEXT,
    "prompt_version" TEXT,
    "schema_id" TEXT,
    "schema_version" TEXT,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "estimated_cost_usd" DECIMAL(10,6),
    "latency_ms" INTEGER NOT NULL,
    "worker_execution_ms" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" "AICallStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_call_logs_organization_id_created_at_idx" ON "ai_call_logs"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_call_logs_model_created_at_idx" ON "ai_call_logs"("model", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_call_logs_prompt_id_prompt_version_idx" ON "ai_call_logs"("prompt_id", "prompt_version");

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
