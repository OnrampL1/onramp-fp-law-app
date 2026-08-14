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
// Intentionally left unfixed (see the backlog entry). Same semantics as
// 025: PASS means "still exactly the documented behavior," FAIL means
// "investigate what changed."
export const QUESTION = "هل يمكن فسخ عقد الايجار لعدم الدفع؟";
