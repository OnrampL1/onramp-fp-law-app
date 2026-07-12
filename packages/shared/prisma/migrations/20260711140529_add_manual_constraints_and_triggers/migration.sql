-- BR-1: an Organization may have at most one User with role = 'OWNER'.
-- Prisma's schema language has no syntax for a partial/conditional unique
-- constraint, so this is written by hand rather than generated.
CREATE UNIQUE INDEX "users_one_owner_per_organization"
  ON "users" ("organization_id")
  WHERE "role" = 'OWNER';

-- DDS 5.1: at most one PENDING invitation per (organization, email) pair.
-- Same limitation as above — Prisma cannot express a partial unique index.
CREATE UNIQUE INDEX "invitations_one_pending_per_email"
  ON "invitations" ("organization_id", "email")
  WHERE "status" = 'PENDING';

-- DDS 6: partial indexes on soft-deletable tables keep active-set queries
-- fast by excluding soft-deleted rows. Prisma generated these as plain
-- (non-partial) composite indexes; we drop and recreate them here scoped
-- to deleted_at IS NULL, since that matches how they're actually queried.
DROP INDEX "contracts_organization_id_business_status_idx";
CREATE INDEX "contracts_organization_id_business_status_idx"
  ON "contracts" ("organization_id", "business_status")
  WHERE "deleted_at" IS NULL;

DROP INDEX "contracts_organization_id_processing_status_idx";
CREATE INDEX "contracts_organization_id_processing_status_idx"
  ON "contracts" ("organization_id", "processing_status")
  WHERE "deleted_at" IS NULL;

DROP INDEX "contracts_organization_id_created_at_idx";
CREATE INDEX "contracts_organization_id_created_at_idx"
  ON "contracts" ("organization_id", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

DROP INDEX "contracts_organization_id_expiration_date_idx";
CREATE INDEX "contracts_organization_id_expiration_date_idx"
  ON "contracts" ("organization_id", "expiration_date")
  WHERE "deleted_at" IS NULL;

DROP INDEX "contract_notes_contract_id_created_at_idx";
CREATE INDEX "contract_notes_contract_id_created_at_idx"
  ON "contract_notes" ("contract_id", "created_at")
  WHERE "deleted_at" IS NULL;

-- BR-13: audit_logs is append-only. No application code path should ever
-- update or delete an existing event, but this trigger makes it true even
-- if that discipline is ever broken — the database rejects it outright.
CREATE OR REPLACE FUNCTION "reject_audit_log_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_logs_no_update"
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "reject_audit_log_mutation"();

CREATE TRIGGER "audit_logs_no_delete"
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "reject_audit_log_mutation"();
