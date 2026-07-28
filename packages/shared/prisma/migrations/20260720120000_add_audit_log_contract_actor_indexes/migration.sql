-- CreateIndex
CREATE INDEX "audit_logs_contract_id_idx" ON "audit_logs"("contract_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
