// Real, answerable Labour Law question (Article 52 — real content
// confirmed against the live DB). The case's scorer additionally proves
// verifyArticleExistence() still catches a synthetic, deliberately
// fabricated article number scoped to this same real cited source — see
// legal-kb-scoring.ts's scoreLegalKbHallucinationCheck.
//
// This is also the exact case that surfaced a real, now-fixed bug (Batch
// 6 diagnosis, 2026-08-14): despite retrieval correctly guaranteed-
// including this article's chunk, the model consistently declined,
// because the chunk's text doesn't restate "Article 52" inline and
// nothing in the source block told it the number — it had no citable
// basis to attribute a claim to that article and correctly refused to
// guess. Fixed by threading the real article_number through to an
// `article=N` tag on the SOURCE block (search.ts's RetrievedChunk,
// investigator.ts's formatSourceBlocks()) plus one prompt line telling
// the model that tag is authoritative. See DOMAIN_REVIEW_BACKLOG.md's
// (resolved) "Legal KB Direct Article Lookup" entry for the full
// before/after. This case was expected to fail before that fix and is
// expected to pass now — a FAIL here again would mean the fix regressed.
export const QUESTION = "ماذا تنص المادة 52 من قانون العمل؟";
