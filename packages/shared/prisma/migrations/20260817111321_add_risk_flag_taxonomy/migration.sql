-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('LIABILITY', 'INDEMNIFICATION', 'AUTO_RENEWAL', 'TERMINATION', 'PAYMENT', 'CONFIDENTIALITY', 'NON_COMPETE', 'IP_ASSIGNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "risk_flags" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "source_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_flags_organization_id_category_idx" ON "risk_flags"("organization_id", "category");

-- CreateIndex
CREATE INDEX "risk_flags_contract_id_idx" ON "risk_flags"("contract_id");

-- AddForeignKey
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "ai_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
