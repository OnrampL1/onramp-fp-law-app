-- AlterTable
-- Tracks whether/when the witness invitation email was handed off to the
-- mail queue (BullMQ has no delivery webhook, so this means "sent", not
-- "confirmed delivered"). Nullable with no default: existing rows and any
-- link created with sendEmail: false simply have no value here.
ALTER TABLE "witness_tokens" ADD COLUMN "email_sent_at" TIMESTAMP(3);
