-- Every line Prisma originally generated ahead of this point was removed by
-- hand, for the same recurring reason noted in
-- 20260811213025_add_organization_brain_chunks: Prisma's migrate-dev
-- diffing doesn't understand the hand-written GIN/HNSW indexes and
-- GENERATED ALWAYS AS columns on contract_chunks and organization_brain_chunks,
-- or the partial `WHERE deleted_at IS NULL` predicate on five
-- contracts/contract_notes indexes, so every new migration re-proposes
-- "fixing" those pre-existing, intentionally hand-written objects back to
-- what its own model expects. Applying that would drop real hybrid-retrieval
-- indexes on both chunk tables and collide with the five existing partial
-- indexes. Strip these lines every time this recurs — do not apply them.

-- AlterTable
ALTER TABLE "organization_brain_items" ADD COLUMN     "extraction_error" TEXT;
