// Code of Commerce Article 94 (confirmed against the live DB) carries real
// amendment metadata: amendingInstrument "126/2019", amendmentEffective-
// Date 2019-03-29 — its stored content even includes the superseded prior
// wording inline ("النص السابق للمادة... تاريخ انتهاء النفاذ: 29/03/2019").
// "قانون التجارة" resolves via search.ts's INSTRUMENT_ALIASES to the Code
// of Commerce specifically, so this is an unambiguous, scoped lookup.
//
// This is also the second confirmed instance of the Batch 6 diagnosis
// finding (see 022's fixture for the full explanation): the model
// declined despite the correct chunk being guaranteed-included, because
// nothing told it the chunk's article number. Fixed by the `article=N`
// SOURCE-block tag (search.ts + investigator.ts's formatSourceBlocks())
// plus a prompt line making that tag citable directly. Expected to pass
// now, not fail — see DOMAIN_REVIEW_BACKLOG.md's resolved entry.
export const QUESTION = "ماذا تنص المادة 94 من قانون التجارة؟";

export const EXPECTED_AMENDING_INSTRUMENT = "126/2019";
