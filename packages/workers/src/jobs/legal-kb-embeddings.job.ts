import type { Job } from "bullmq";
import {
  packSectionIntoChunks,
  generateEmbeddings,
  replaceLegalSourceChunks,
  getMaxChunksPerLegalSource,
  getPrismaClient,
  type LegalKbEmbeddingsJobData,
  type LegalKbEmbeddingsJobResult,
  type LegalChunkToStore,
} from "@starter-kit/shared";

const prisma = getPrismaClient();

// Enactment-clause articles get a fixed, distinguishable heading rather
// than whatever the tree's own heading path (or lack of one) would say —
// mirrors the same rule already applied in legal-source-crawler.ts's own
// headingPath assignment (ENACTMENT_CLAUSE_HEADING), kept in sync here
// rather than imported cross-package since packages/workers is the only
// place that currently depends on legal-source-crawler.ts.
const ENACTMENT_CLAUSE_HEADING = "أحكام الإصدار (Enactment Provisions)";

// The crawler emits amendmentEffectiveDate as the site's own "DD/MM/YYYY"
// string (legal-source-scraper.ts's EFFECTIVE_DATE_PATTERN) — LegalChunk's
// column is a real DateTime, so it's parsed once here rather than storing
// the raw string. Returns null rather than throwing on anything
// unexpected — a malformed date is metadata noise, not a reason to fail an
// otherwise-good chunk.
function parseDmyDate(raw: string | null): Date | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date;
}

// This job trusts its input completely — it does not call
// crawlLegalSource()/assertCleanCrawl() itself, and does not re-fetch
// anything from the source site. The caller (an operator script, per
// Domain Review item 7) is responsible for having already run a clean
// crawl before enqueueing; job.data.articles is that crawl's own
// already-verified output. If that boundary is ever violated (a caller
// enqueues from a dirty crawl), it fails silently from this job's
// perspective — worth remembering if this job's callers ever multiply.
export async function processLegalKbEmbeddingsJob(
  job: Job<LegalKbEmbeddingsJobData, LegalKbEmbeddingsJobResult>,
): Promise<LegalKbEmbeddingsJobResult> {
  const { legalSourceId, articles } = job.data;

  const legalSource = await prisma.legalSource.findUniqueOrThrow({
    where: { id: legalSourceId },
    select: { legalStatus: true, licenseStatus: true },
  });

  const chunks: LegalChunkToStore[] = [];
  for (const article of articles) {
    const sectionChunks = packSectionIntoChunks(
      article.isEnactmentClause ? ENACTMENT_CLAUSE_HEADING : article.headingPath,
      article.text,
      chunks.length,
    );
    for (const chunk of sectionChunks) {
      chunks.push({
        ...chunk,
        embedding: [],
        articleNumber: article.articleNumber,
        amendingInstrument: article.amendingInstrument,
        amendmentEffectiveDate: parseDmyDate(article.amendmentEffectiveDate),
        legalStatus: legalSource.legalStatus,
        licenseStatus: legalSource.licenseStatus,
      });
    }
  }

  const maxChunks = getMaxChunksPerLegalSource();

  // Checked before any embedding call fires — the whole point of the
  // ceiling is stopping spend before it happens, not after. Unlike the
  // contract/org-brain ceiling checks, exceeding this one also means zero
  // rows are ever persisted for this run (not even a partial batch) — the
  // existing rows (if this is a re-ingestion) are left untouched, since
  // replaceLegalSourceChunks() is never called at all on this path.
  if (chunks.length > maxChunks) {
    console.error(
      `[legal-kb-embeddings] Legal source ${legalSourceId} produced ${chunks.length} chunks, over the ${maxChunks} ceiling — aborting before any embedding calls or persistence`,
    );
    return { status: "CEILING_EXCEEDED", chunkCount: chunks.length };
  }

  if (chunks.length === 0) {
    await replaceLegalSourceChunks(legalSourceId, []);
    return { status: "COMPLETED", chunkCount: 0 };
  }

  // No owning organization to attribute this call to — see
  // EmbeddingRequest.organizationId's doc comment (providers/index.ts).
  const { embeddings } = await generateEmbeddings({
    texts: chunks.map((chunk) => chunk.content),
    organizationId: null,
  });

  await replaceLegalSourceChunks(
    legalSourceId,
    chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] ?? [] })),
  );

  console.info(
    `[legal-kb-embeddings] Stored ${chunks.length} chunks for legal source ${legalSourceId}`,
  );
  return { status: "COMPLETED", chunkCount: chunks.length };
}
