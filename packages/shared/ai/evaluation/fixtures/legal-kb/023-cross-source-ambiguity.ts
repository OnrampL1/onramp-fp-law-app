// Article 654 exists as two unrelated articles in two different ingested
// sources (confirmed against the live DB): the Code of Obligations and
// Contracts and the Code of Commerce. This question deliberately names no
// instrument, so it is genuinely ambiguous — exactly the Batch 4 bug
// (search.ts's pre-fix behavior boosted both at equal, unverified
// guaranteed-inclusion priority). Regression proof for the fix: see
// legal-kb-scoring.ts's scoreLegalKbCrossSourceAmbiguityGuard.
export const QUESTION = "ماذا تنص المادة 654؟";
