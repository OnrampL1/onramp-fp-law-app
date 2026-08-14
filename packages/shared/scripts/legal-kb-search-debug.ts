// Manual evaluation harness for the Batch 4 Arabic full-text quality
// review — NOT automated measurement/decision logic, just a way to see the
// raw, pre-fusion candidate lists searchLegalKbChunks() would fuse.
// Judging whether a full-text-only match is actually relevant requires
// seeing vectorCandidates and fullTextCandidates separately, since a chunk
// that only one method found can still reach the final top-K after RRF.
//
// Forces AI_PROVIDER_MODE=real (a mock embedding is meaningless for
// judging real semantic quality) and defaults LEGAL_KB_LICENSE_MODE to
// "development" (production mode would return nothing right now — no
// source has gone through the production-clearances review yet) unless
// already set in the environment.
//
// Usage: npm run legal-kb-search-debug -- "<Arabic legal question>"

process.env.AI_PROVIDER_MODE = "real";
process.env.LEGAL_KB_LICENSE_MODE = process.env.LEGAL_KB_LICENSE_MODE ?? "development";

import { generateEmbeddings } from "../ai/providers";
import { legalKbCandidateFetcher } from "../ai/retrieval/search";

const CANDIDATES_PER_METHOD = 20;

function printCandidates(label: string, rows: { id: string; source_id: string; chunk_index: number; heading_path: string | null; content: string }[]) {
  console.log(`\n--- ${label} (${rows.length}) ---`);
  rows.forEach((row, i) => {
    const preview = row.content.replace(/\s+/g, " ").trim().slice(0, 160);
    console.log(`${i + 1}. [${row.source_id.slice(0, 8)}… chunk ${row.chunk_index}] ${row.heading_path ?? "(no heading)"}`);
    console.log(`   ${preview}${row.content.length > 160 ? "…" : ""}`);
  });
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.error('Usage: npm run legal-kb-search-debug -- "<query>"');
    process.exit(1);
  }

  console.log(`Query: ${query}`);
  console.log(`LEGAL_KB_LICENSE_MODE=${process.env.LEGAL_KB_LICENSE_MODE}`);

  const { embeddings } = await generateEmbeddings({ texts: [query], organizationId: null });
  const queryEmbedding = embeddings[0];
  if (!queryEmbedding) {
    console.error("No query embedding produced.");
    process.exit(1);
  }

  const fetcher = legalKbCandidateFetcher();
  const [vectorCandidates, fullTextCandidates] = await Promise.all([
    fetcher.vectorCandidates(queryEmbedding, CANDIDATES_PER_METHOD),
    fetcher.fullTextCandidates(query, CANDIDATES_PER_METHOD),
  ]);

  printCandidates("vectorCandidates", vectorCandidates);
  printCandidates("fullTextCandidates", fullTextCandidates);

  const vectorIds = new Set(vectorCandidates.map((r) => r.id));
  const fullTextOnly = fullTextCandidates.filter((r) => !vectorIds.has(r.id));
  console.log(`\n--- full-text-only candidates (${fullTextOnly.length}) — not found by vector search at all ---`);
  fullTextOnly.forEach((row) => console.log(`  [${row.source_id.slice(0, 8)}… chunk ${row.chunk_index}] ${row.heading_path ?? "(no heading)"}`));

  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
