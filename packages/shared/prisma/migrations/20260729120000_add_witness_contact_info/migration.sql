-- AlterTable
-- Adds the witness's contact info to witness_tokens. Neither the Blueprint's
-- table def nor the initial migration carried these columns, but both the
-- OpenAPI contract (WitnessLinkBody/WitnessToken) and the Witness Workflow
-- UI require a persisted witness identity per invitation (who a link was
-- issued to), not just a hash and an expiry. witness_email is backfilled to
-- '' for any pre-existing rows, then locked to NOT NULL with no default.
ALTER TABLE "witness_tokens" ADD COLUMN "witness_email" TEXT NOT NULL DEFAULT '',
ADD COLUMN "witness_name" TEXT;

ALTER TABLE "witness_tokens" ALTER COLUMN "witness_email" DROP DEFAULT;
