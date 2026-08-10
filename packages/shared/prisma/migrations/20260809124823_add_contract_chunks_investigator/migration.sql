-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
-- content_tsv is a generated column (Prisma has no syntax for this — hand
-- written, same as the manual-migration precedent in
-- 20260711140529_add_manual_constraints_and_triggers).
CREATE TABLE "contract_chunks" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "heading_path" TEXT,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "embedding" vector(1536),
    "content_tsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_chunks_contract_id_idx" ON "contract_chunks"("contract_id");

-- CreateIndex
CREATE INDEX "contract_chunks_organization_id_idx" ON "contract_chunks"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_chunks_contract_id_chunk_index_key" ON "contract_chunks"("contract_id", "chunk_index");

-- CreateIndex
-- Full-text search leg of Phase 3's hybrid retrieval (AI_ARCHITECTURE.md
-- Section 6) — defined terms and exact legal phrases need keyword
-- matching, not just vector similarity.
CREATE INDEX "contract_chunks_content_tsv_idx" ON "contract_chunks" USING GIN ("content_tsv");

-- CreateIndex
-- Vector similarity leg of hybrid retrieval. HNSW over cosine distance,
-- matching the cosine similarity already used in the pre-pgvector
-- embeddings.ts scaffolding this replaces.
CREATE INDEX "contract_chunks_embedding_idx" ON "contract_chunks" USING hnsw ("embedding" vector_cosine_ops);

-- Note: the block below intentionally does NOT recreate
-- contract_notes_contract_id_created_at_idx or the four
-- contracts_organization_id_*_idx indexes. Prisma's migrate-dev diffing
-- doesn't track the WHERE deleted_at IS NULL predicate that
-- 20260711140529_add_manual_constraints_and_triggers applied to those (by
-- hand, for the same reason this migration's generated column and indexes
-- above are hand-written), so it proposed recreating them as plain
-- (non-partial) indexes under the same name — which already exist and
-- would collide with the partial versions on a clean database, not just
-- this dev database. Removed rather than applied.

-- AddForeignKey
ALTER TABLE "contract_chunks" ADD CONSTRAINT "contract_chunks_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_chunks" ADD CONSTRAINT "contract_chunks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
