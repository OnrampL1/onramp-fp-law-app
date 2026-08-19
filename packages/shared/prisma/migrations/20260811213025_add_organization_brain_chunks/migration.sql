-- The lines Prisma originally generated ahead of this point (DROP INDEX on
-- contract_chunks_content_tsv_idx / contract_chunks_embedding_idx, an ALTER
-- COLUMN ... DROP DEFAULT on contract_chunks.content_tsv, and a
-- re-CREATE INDEX of contract_notes_contract_id_created_at_idx and the four
-- contracts_organization_id_*_idx indexes) were removed by hand.
--
-- Both are the same class of problem: this schema has DDL that Prisma's
-- migrate-dev diffing doesn't understand (the GIN/HNSW indexes and the
-- GENERATED ALWAYS AS column on contract_chunks, and the partial
-- `WHERE deleted_at IS NULL` predicate on the five contracts/contract_notes
-- indexes — see 20260711140529_add_manual_constraints_and_triggers). Every
-- time a new migration is generated, Prisma proposes "fixing" those
-- pre-existing, intentionally hand-written objects back to what its own
-- model expects. Applying that would have dropped Clause Investigator's
-- real hybrid-retrieval indexes and collided with the five existing partial
-- indexes (same names, would fail to apply). Same precedent as the
-- Phase 3 migration's own note on this exact issue — strip these lines
-- every time this recurs, don't apply them.

-- AlterTable
ALTER TABLE "organization_brain_items" ADD COLUMN     "extracted_text" TEXT;

-- CreateTable
-- content_tsv is a generated column (Prisma has no syntax for this — same
-- hand-written precedent as 20260809124823_add_contract_chunks_investigator).
CREATE TABLE "organization_brain_chunks" (
    "id" UUID NOT NULL,
    "organization_brain_item_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "heading_path" TEXT,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "embedding" vector(1536),
    "content_tsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_brain_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_brain_chunks_organization_brain_item_id_idx" ON "organization_brain_chunks"("organization_brain_item_id");

-- CreateIndex
CREATE INDEX "organization_brain_chunks_organization_id_idx" ON "organization_brain_chunks"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_brain_chunks_organization_brain_item_id_chunk__key" ON "organization_brain_chunks"("organization_brain_item_id", "chunk_index");

-- CreateIndex
-- Full-text leg of hybrid retrieval — same rationale as contract_chunks.
CREATE INDEX "organization_brain_chunks_content_tsv_idx" ON "organization_brain_chunks" USING GIN ("content_tsv");

-- CreateIndex
-- Vector similarity leg — same HNSW/cosine configuration as contract_chunks.
CREATE INDEX "organization_brain_chunks_embedding_idx" ON "organization_brain_chunks" USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "organization_brain_chunks" ADD CONSTRAINT "organization_brain_chunks_organization_brain_item_id_fkey" FOREIGN KEY ("organization_brain_item_id") REFERENCES "organization_brain_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_brain_chunks" ADD CONSTRAINT "organization_brain_chunks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
