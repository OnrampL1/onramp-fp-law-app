// Dev-only Legal Knowledge Base seed — the "operator script" flagged as
// missing in legal-kb-embeddings.job.ts's own comment ("Domain Review item
// 7... never built"). This is a narrow, safe version of it: it does NOT
// crawl the live site (see legal-source-crawler.ts's own comment on why
// that's a separate, explicitly gated step) — it parses the REAL, byte-exact
// fixture pages already checked into
// packages/workers/src/lib/__fixtures__/legal-source-scraper/
// (REAL_FIXTURES.md documents their real source URLs and fetch dates), and
// stores the result strictly as DEVELOPMENT_ONLY, never
// CLEARED_FOR_PRODUCTION — that status change requires an actual legal
// licensing review (see docs/PHASE6_LEGAL_CORPUS_VALIDATION.md), which this
// script cannot and does not perform.
//
// These are literally the only two real (non-synthetic) article fixtures
// checked into the repo — see REAL_FIXTURES.md. Adding a third law's real
// content requires an actual live crawl (not wired up; see
// legal-source-crawler.ts's own comment), not more entries in this file.
//
// 1. Article 844 of the Code of Obligations and Contracts (قانون الموجبات
//    والعقود) — substantive: defines a company as a mutual profit-sharing
//    contract. Provenance: docs/PHASE6_LEGAL_CORPUS_VALIDATION.md Part 1,
//    Document 1 (promulgated 09/03/1932, Official Gazette No. 2642).
// 2. The enactment/ratification clause of Law 81/2018, the Electronic
//    Transactions and Personal Data Law (قانون المعاملات الإلكترونية
//    والبيانات ذات الطابع الشخصي) — procedural, not substantive: it only
//    states how/when the law was ratified and took effect, not any actual
//    data-protection rule. Included for real breadth (a second law, proving
//    the corpus isn't hardcoded to one source) but deliberately NOT used as
//    the product's featured Legal KB demo question — see the suggested-
//    questions comment in LegalAssistant.tsx for why. Provenance:
//    docs/PHASE6_LEGAL_CORPUS_VALIDATION.md Part 1, Document 3 (promulgated
//    10/10/2018; the Gazette publish date itself has an unresolved
//    discrepancy between this source and secondary commentary, noted as-is
//    below rather than silently picking one).
//
// Usage: npm run seed-legal-kb-dev --workspace=@starter-kit/workers

import path from "path";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Must be forced before any @starter-kit/shared import touches config -
// searchLegalKbChunks() falls closed to "production" (serving only
// CLEARED_FOR_PRODUCTION rows) otherwise, and this script only ever writes
// DEVELOPMENT_ONLY content, so a demo run against a mis-set env would
// silently show nothing.
process.env.LEGAL_KB_LICENSE_MODE = "development";

import type { Job } from "bullmq";
import {
  getPrismaClient,
  type LegalKbEmbeddingsJobData,
  type LegalKbEmbeddingsJobResult,
} from "@starter-kit/shared";
import {
  parseTreeIndexPage,
  parseArticlePage,
  findArticleHeadingPath,
} from "../src/lib/legal-source-scraper";
import { processLegalKbEmbeddingsJob } from "../src/jobs/legal-kb-embeddings.job";

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../src/lib/__fixtures__/legal-source-scraper",
);

const prisma = getPrismaClient();

interface SeedSourceConfig {
  articleFixture: string;
  // Only the Code of Obligations and Contracts has a real tree-index
  // fixture to resolve a heading path from; Law 81/2018's real fixture is a
  // single standalone article page with no accompanying tree capture.
  treeFixture: string | null;
  legalSourceData: Parameters<typeof prisma.legalSource.create>[0]["data"];
}

const SOURCES: SeedSourceConfig[] = [
  {
    articleFixture: "article-844.real.html",
    treeFixture: "tree-index.real.html",
    legalSourceData: {
      title: "قانون الموجبات والعقود (Code of Obligations and Contracts)",
      sourceType: "CODE",
      authorityTier: "BINDING_LEGISLATION",
      instrumentNumber: "Law No. 0 (no formal sequential number — French Mandate-era instrument)",
      language: "ar",
      jurisdiction: "LB",
      promulgatingAuthority: "Lebanese Republic",
      compilerSource:
        "Lebanese University Center for Legal Informatics Studies and Research (مركز المعلوماتية القانونية)",
      sourceUrl:
        "http://legallaw.ul.edu.lb/LawArticles.aspx?LawArticleID=972278&LawID=244226",
      officialGazetteNumber: "2642",
      officialGazettePublishDate: new Date(Date.UTC(1932, 3, 11)),
      officialGazettePage: "2-104",
      promulgationDate: new Date(Date.UTC(1932, 2, 9)),
      legalStatus: "IN_FORCE",
      licenseStatus: "DEVELOPMENT_ONLY",
      lastVerifiedAt: new Date(),
    },
  },
  {
    articleFixture: "article-enactment-clause.real.html",
    treeFixture: null,
    legalSourceData: {
      title:
        "قانون المعاملات الإلكترونية والبيانات ذات الطابع الشخصي (Electronic Transactions and Personal Data Law)",
      sourceType: "LEGISLATION",
      authorityTier: "BINDING_LEGISLATION",
      instrumentNumber: "Law No. 81/2018",
      language: "ar",
      jurisdiction: "LB",
      promulgatingAuthority: "Lebanese Republic",
      compilerSource:
        "Lebanese University Center for Legal Informatics Studies and Research (مركز المعلوماتية القانونية)",
      sourceUrl:
        "http://legallaw.ul.edu.lb/LawArticles.aspx?LawArticleID=1094657&LawID=278573",
      // The site's own field states No. 45 / 18-10-2018 / pages 4546-4568;
      // docs/PHASE6_LEGAL_CORPUS_VALIDATION.md flags an unresolved
      // discrepancy against secondary commentary (which cites 31/12/2018
      // publication, 31/03/2019 entry into force) - recorded as this site's
      // own stated value, not as a resolved fact.
      officialGazetteNumber: "45",
      officialGazettePublishDate: new Date(Date.UTC(2018, 9, 18)),
      officialGazettePage: "4546-4568",
      promulgationDate: new Date(Date.UTC(2018, 9, 10)),
      legalStatus: "IN_FORCE",
      licenseStatus: "DEVELOPMENT_ONLY",
      lastVerifiedAt: new Date(),
    },
  },
];

async function seedSource(config: SeedSourceConfig): Promise<void> {
  const articleHtml = readFileSync(
    path.join(FIXTURES_DIR, config.articleFixture),
    "utf-8",
  );
  const article = parseArticlePage(articleHtml);

  const headingPath = config.treeFixture
    ? findArticleHeadingPath(
        parseTreeIndexPage(
          readFileSync(path.join(FIXTURES_DIR, config.treeFixture), "utf-8"),
        ),
        Number(article.articleNumber),
      )
    : null;

  console.info(
    `\nParsed Article ${article.articleNumber} of "${config.legalSourceData.title}" ` +
      `(${headingPath ?? (article.isEnactmentClause ? "enactment clause" : "no heading found")}), ` +
      `amended by ${article.amendingInstrument ?? "(no amendment)"}` +
      (article.amendmentEffectiveDate ? ` effective ${article.amendmentEffectiveDate}` : ""),
  );

  // Idempotent: re-running this script reuses the same LegalSource row
  // (matched by sourceUrl, not a unique DB constraint, so a plain findFirst
  // rather than upsert) instead of creating duplicates.
  const existing = await prisma.legalSource.findFirst({
    where: { sourceUrl: config.legalSourceData.sourceUrl as string },
  });

  const legalSource = existing
    ? await prisma.legalSource.update({ where: { id: existing.id }, data: config.legalSourceData })
    : await prisma.legalSource.create({ data: config.legalSourceData });

  console.info(`LegalSource id: ${legalSource.id} (licenseStatus: ${legalSource.licenseStatus})`);

  const jobData: LegalKbEmbeddingsJobData = {
    legalSourceId: legalSource.id,
    articles: [
      {
        articleNumber: article.articleNumber,
        headingPath,
        text: article.text,
        amendingInstrument: article.amendingInstrument,
        amendmentEffectiveDate: article.amendmentEffectiveDate,
        isEnactmentClause: article.isEnactmentClause,
      },
    ],
  };
  const fakeJob = { data: jobData } as Job<LegalKbEmbeddingsJobData, LegalKbEmbeddingsJobResult>;

  const result = await processLegalKbEmbeddingsJob(fakeJob);
  console.info(`Chunking/embedding result: ${result.status}, ${result.chunkCount} chunk(s) stored.`);
}

async function main(): Promise<void> {
  if (process.env.AI_PROVIDER_MODE === "mock") {
    throw new Error(
      "AI_PROVIDER_MODE=mock would store fake embeddings this corpus can never actually be searched with — unset it (or set AI_PROVIDER_MODE=real) before running this script.",
    );
  }

  for (const config of SOURCES) {
    await seedSource(config);
  }

  await prisma.$disconnect();
}

main()
  .then(() => {
    // Importing @starter-kit/shared eagerly opens BullMQ/Redis connections
    // (its queue clients) as a side effect, even though this script never
    // uses them - those keep the process alive after main() resolves, so
    // this script would otherwise hang instead of exiting.
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
