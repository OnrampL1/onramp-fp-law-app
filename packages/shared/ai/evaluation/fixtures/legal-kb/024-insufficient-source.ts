// The Lebanese Penal Code (قانون العقوبات) is not one of the five ingested
// sources (Code of Obligations and Contracts, Code of Commerce, Labour
// Law, Copyright Law, Electronic Transactions/Personal Data Law) — a real
// legal question with genuinely no answer available in this corpus.
// Hybrid retrieval has no relevance threshold, so this still returns a
// best-effort top-8 from the five real sources; what's being tested is
// whether the model recognizes none of them actually answer this and
// declines, per the prompt's own "insufficient source" instruction,
// instead of fabricating an answer from an irrelevant chunk.
export const QUESTION = "ما هي عقوبة السرقة في قانون العقوبات اللبناني؟";
