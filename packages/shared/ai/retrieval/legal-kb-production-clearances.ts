// A checked-in, human-reviewed allowlist of LegalSource ids cleared for
// production traffic — a second, independent gate alongside the
// LegalSource.licenseStatus DB column, not a restatement of it.
//
// Why two gates instead of trusting licenseStatus alone: licenseStatus is
// mutable application data — a bug, a bad migration, or a careless manual
// DB edit could flip a row to CLEARED_FOR_PRODUCTION without anyone
// actually having done the legal/licensing risk-acceptance review that
// status is supposed to represent (see the /// doc comment on
// LegalLicenseStatus in schema.prisma). This file requires a code change
// and PR review to add an entry, so a DB-only mistake can't silently start
// serving a source in production — searchLegalKbChunks() (search.ts)
// excludes a CLEARED_FOR_PRODUCTION row from production-mode results
// unless its id is also listed here.
//
// Starts and stays empty: as of Phase 6 Batch 4, every ingested source
// (Code of Obligations and Contracts, Code of Commerce, Law 81/2018,
// Law 75/1999, Labour Law) is licenseStatus DEVELOPMENT_ONLY — none has
// gone through the risk-acceptance review CLEARED_FOR_PRODUCTION requires
// (docs/PHASE6_LEGAL_CORPUS_VALIDATION.md's licensing findings: no
// terms-of-use or bulk-access policy found for any of the five sources).
// Do not add an id here without that review actually having happened.
export const LEGAL_KB_PRODUCTION_CLEARANCES: readonly string[] = [];
