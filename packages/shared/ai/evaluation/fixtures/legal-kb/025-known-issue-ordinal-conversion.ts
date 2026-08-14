// KNOWN-ISSUE REGRESSION WATCH — not a quality bar. See
// legal-kb-scoring.ts's scoreLegalKbKnownIssueStillReproduces and
// DOMAIN_REVIEW_BACKLOG.md's "Legal KB Answer Generation — Residual
// Citation-Rejection Causes" entry for full detail.
//
// This exact question against Code of Obligations and Contracts Article
// 177 has been observed, twice independently (Batch 5's initial diagnosis
// and a later re-measurement after the legal-kb-ask/v1.md prompt fix), to
// make the model convert the source's spelled-out Arabic ordinals
// (اولا/ثانيا/ثالثا/رابعا/خامسا) into digits when quoting — defeating
// verifyCitations()'s strict-match requirement even after an explicit
// prompt instruction not to. This is intentionally left unfixed for now
// (see the backlog entry for why a citations.ts normalization fix isn't
// safe here). The case exists purely so a future, unrelated change to the
// prompt/schema/normalization logic can't silently make this worse (or
// better) without anyone noticing — a PASS means "still exactly the
// documented behavior," a FAIL means "investigate what changed."
export const QUESTION = "ما هي شروط صحة الرضى في العقد؟";
