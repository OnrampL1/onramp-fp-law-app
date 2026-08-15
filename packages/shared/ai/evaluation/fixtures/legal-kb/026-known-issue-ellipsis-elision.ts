// KNOWN-ISSUE REGRESSION WATCH — not a quality bar. See
// legal-kb-scoring.ts's scoreLegalKbKnownIssueStillReproduces and
// DOMAIN_REVIEW_BACKLOG.md's "Legal KB Answer Generation — Residual
// Citation-Rejection Causes" entry for full detail.
//
// This exact question against Code of Obligations and Contracts Article
// 595 has been observed, twice independently, to make the model splice
// non-adjacent list items into a single citation excerpt — first via a
// literal ellipsis ("..."), and, after the legal-kb-ask/v1.md prompt fix
// explicitly forbidding that, via silently dropping the skipped items and
// concatenating the remainder with a bare newline instead — same
// underlying elision problem in a form the instruction didn't anticipate.
// A third attempt (post-Batch-6) tried restructuring what's allowed
// instead of another "don't do X" instruction: legal-kb-ask/v1.md was
// temporarily rewritten to direct the model to cite non-adjacent relevant
// parts of a source as separate entries in "sources" (each a contiguous
// span, repeating the same chunkId), with a concrete worked example
// mirroring this exact failure shape (an intro clause plus one relevant
// item of a numbered list). Live re-verified, 2/2, against the real
// pipeline with the real question below: the model ignored the new
// instruction entirely and spliced with a literal "..." again, identically
// to the original Batch 5 behavior — no change in outcome. The prompt
// change was reverted afterward (it didn't help, so there was no reason to
// keep carrying it) — legal-kb-ask/v1.md is back to its original wording.
// Unlike 025's ordinal case, this was not fixed by a citations.ts
// normalization either, since (unlike a fixed ordinal<->digit table) there
// is no safe, curated way to reconstruct which two non-adjacent spans were
// meant to be joined without weakening the fabrication check for other,
// genuinely-spliced-fabricated text. Confirmed unresolved after two
// independent attempts, not chased further, same "don't chase to zero in
// Phase 6" reasoning as the rest of Batch 5's residual causes. Same
// semantics as before: PASS means "still exactly the documented behavior,"
// FAIL means "investigate what changed."
export const QUESTION = "هل يمكن فسخ عقد الايجار لعدم الدفع؟";
