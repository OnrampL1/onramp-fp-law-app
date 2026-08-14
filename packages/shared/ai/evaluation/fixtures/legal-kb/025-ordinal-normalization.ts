// Formerly a KNOWN-ISSUE REGRESSION WATCH (see DOMAIN_REVIEW_BACKLOG.md's
// "Legal KB Answer Generation — Residual Citation-Rejection Causes" entry
// for the original diagnosis). This exact question against Code of
// Obligations and Contracts Article 177 reproduced a real, confirmed
// citation-rejection pattern twice independently: the model converts the
// source's spelled-out Arabic ordinals (اولا/ثانيا/ثالثا/رابعا/خامسا) to
// digits (1/2/3/4/5) when quoting, defeating verifyCitations()'s
// strict-match requirement even after an explicit prompt instruction not
// to (the instruction did not change the model's behavior at all,
// measured on repeated attempts).
//
// Fixed by a different approach: a fixed, curated ordinal<->digit
// equivalence table added to citations.ts's normalize() (same category as
// the earlier whitespace/alef-hamza fixes — a provably meaning-preserving
// canonicalization, not a fuzzy heuristic), rather than a third attempt at
// a prompt instruction. Live re-verified, 2/2, against the real pipeline
// with the real question below; the model still converts the ordinals to
// digits exactly as before (unchanged model behavior), but the citation
// now passes because both sides normalize to the same digit form. This
// case now uses scoreLegalKbGrounding (the same real-citation-verification
// bar as case 021), not scoreLegalKbKnownIssueStillReproduces — a FAIL
// here means the fix regressed, not "documented behavior changed."
export const QUESTION = "ما هي شروط صحة الرضى في العقد؟";
