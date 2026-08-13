// Parses legallaw.ul.edu.lb's flat-view page template (LawView.aspx) into a
// normalized intermediate representation, for Phase 6 (Lebanese Legal
// Knowledge Base) ingestion (docs/PHASE6_IMPLEMENTATION_PLAN.md Section 8).
// Covers the Labour Law source specifically (the only currently-known
// LawView.aspx-template source in the five-source corpus).
//
// Built after the Batch 2 tree-view crawler (legal-source-crawler.ts) was
// found not to apply here: LawView.aspx isn't paginated per-article the way
// Law.aspx/LawArticles.aspx is — a single fetch returns the (near-)complete
// text of the whole document inline (confirmed 2026-08-15: 117 unique
// "المادة N" mentions in the body text against a tree-confirmed max of 114
// articles, the few extras being in-article cross-references), and its
// LawArticleID values are neither linear nor unique per article (confirmed:
// Article 50 has two different, both-valid, byte-identical-content IDs).
// So this parser reads the whole page in one pass instead of walking IDs.
//
// Confirmed structural findings (2026-08-15, against the real page —
// see __fixtures__/legal-source-flatview-parser/REAL_FIXTURES.md):
//   - Content is a flat sequence of <h2> heading blocks, each followed by
//     its own content <div>. Three kinds of <h2> occur, distinguished only
//     by their text (no distinguishing class observed): Book/Part and
//     Chapter headings, which don't contain the article-number keyword;
//     and article headings, which do.
//   - Encoding: the HTTP Content-Type header says utf-8 and is correct;
//     the in-page <meta charset="windows-1252"> tag is WRONG and must be
//     ignored — confirmed directly (Python strict-UTF-8 decode succeeds,
//     real readable Arabic text, no mojibake). Callers must decode by the
//     HTTP header (e.g. a standard fetch().text()), never by re-parsing the
//     misleading meta tag.
//   - Amendment tags use a different format than the tree-view template:
//     they name the amending law explicitly (with a "law" keyword) and use
//     &nbsp; entities the tree-view format doesn't have. Also confirmed
//     present, beyond what was originally scoped: a second verb form for
//     inserted sub-numbered articles (e.g. article "12 - 1"), a third verb
//     form for repealed articles (separately marked in the heading text),
//     and a "law executed by decree" variant instrument phrase. All three
//     verbs and both instrument-citation phrasings are handled by
//     AMENDMENT_TAG_PATTERN below; multiple chained tags on one article are
//     all captured, not just the first.
//   - Sub-numbered articles occur in two conventions: "12 - 1" through
//     "12 - 10" (inserted after Article 12) and a "bis"-style suffix
//     (a classic Arabic legal-drafting convention for an inserted article).
//     articleNumber preserves the full label (e.g. "12-1") rather than
//     collapsing it to a bare integer, since these are distinct legal
//     articles, not the same article restated.

import * as cheerio from "cheerio";
import { LegalSourceParseError } from "./legal-source-scraper";

export interface FlatViewAmendment {
  verb: "amended" | "inserted" | "repealed";
  instrument: string;
}

export interface FlatViewArticle {
  articleNumber: string;
  headingPath: string | null;
  text: string;
  amendments: FlatViewAmendment[];
  isRepealed: boolean;
  isEnactmentClause: boolean;
}

const ARABIC_ARTICLE_WORD = "المادة"; // المادة
const ARABIC_BIS_WORD = "مكرر"; // مكرر
const ARABIC_REPEALED_PHRASE = "مادة\\s*ملغاة"; // مادة ملغاة
const ARABIC_ENACTMENT_WORD = "اصدار"; // اصدار
const ARABIC_BOOK_WORD = "الباب"; // الباب
const ARABIC_CHAPTER_WORD = "الفصل"; // الفصل
const ARABIC_SINGLE_CHAPTER_WORD = "فصل\\s*وحيد"; // فصل وحيد
const ARABIC_LAW_WORD = "قانون"; // قانون
const ARABIC_EXECUTED_BY_DECREE = "منفذ\\s*بمرسوم"; // منفذ بمرسوم

// Verb roots confirmed on the real page: amended ("عدلت"),
// inserted ("أضيفت"), repealed ("الغيت") — each followed by
// "بموجب" ("pursuant to").
const AMENDED_VERB = "عدلت";
const INSERTED_VERB = "أضيفت";
const REPEALED_VERB = "الغيت";
const PURSUANT_TO_WORD = "بموجب";

const VERB_TO_KEY: Record<string, FlatViewAmendment["verb"]> = {
  [AMENDED_VERB]: "amended",
  [INSERTED_VERB]: "inserted",
  [REPEALED_VERB]: "repealed",
};

const ARTICLE_HEADING_PATTERN = new RegExp(`${ARABIC_ARTICLE_WORD}\\s*(\\d+(?:\\s*-\\s*(?:\\d+|${ARABIC_BIS_WORD}))?)`);
const REPEALED_PATTERN = new RegExp(ARABIC_REPEALED_PHRASE);
const ENACTMENT_CLAUSE_PATTERN = new RegExp(`${ARABIC_ARTICLE_WORD}\\s*\\d+\\s*-\\s*${ARABIC_ENACTMENT_WORD}`);

// Matches all three confirmed verb forms ("amended"/"inserted"/"repealed"
// + "pursuant to"), tolerating an optional "law" or "law executed by
// decree" phrase and whitespace (including &nbsp;, which \s covers) between
// "pursuant to" and the instrument number. Captures every occurrence on the
// article (global flag) since some carry multiple chained amendment tags.
// Confirmed against the real page: the opening paren is followed by a
// space before the verb (e.g. "( أضيفت بموجب : 3 / 2025)") — an earlier version of
// this regex required the verb immediately after "(" and missed every
// "inserted" and "repealed" tag as a result.
const AMENDMENT_TAG_PATTERN = new RegExp(
  `\\(\\s*(${AMENDED_VERB}|${INSERTED_VERB}|${REPEALED_VERB})\\s*${PURSUANT_TO_WORD}\\s*(?:${ARABIC_LAW_WORD}\\s*)?(?:${ARABIC_EXECUTED_BY_DECREE}\\s*)?\\s*:?\\s*(\\d+)\\s*\\/\\s*(\\d{4})\\)`,
  "g",
);

const BOOK_HEADING_PATTERN = new RegExp(`^${ARABIC_BOOK_WORD}`);
const CHAPTER_HEADING_PATTERN = new RegExp(`^(${ARABIC_CHAPTER_WORD}|${ARABIC_SINGLE_CHAPTER_WORD})`);

function normalizeNumberLabel(raw: string): string {
  return raw.replace(/\s+/g, "");
}

/**
 * Parses a LawView.aspx-shaped flat-view page into its full list of
 * articles. Walks every <h2> in document order: headings not containing
 * the article-number keyword update a simple two-level (Book > Chapter)
 * heading-path accumulator; headings that do contain it are parsed as
 * articles, paired with their following content block. Conservative on
 * text extraction (falls back to the full following-sibling text rather
 * than throwing) — same discipline as legal-source-scraper.ts's
 * parseArticlePage().
 */
export function parseFlatViewPage(html: string): FlatViewArticle[] {
  const $ = cheerio.load(html);
  const headings = $("#MainContent_divarticles h2, h2").toArray();
  const relevantHeadings = headings.filter((el) => {
    const text = $(el).text().trim();
    return text.length > 0 && !$(el).closest("nav, header, footer").length;
  });

  const articles: FlatViewArticle[] = [];
  let currentBook: string | null = null;
  let currentChapter: string | null = null;

  for (const el of relevantHeadings) {
    const $el = $(el);
    const headingText = $el.text().replace(/\s+/g, " ").trim();

    const articleMatch = headingText.match(ARTICLE_HEADING_PATTERN);
    if (!articleMatch) {
      // Structural heading, not an article — update the accumulator.
      if (BOOK_HEADING_PATTERN.test(headingText)) {
        currentBook = headingText;
        currentChapter = null;
      } else if (CHAPTER_HEADING_PATTERN.test(headingText)) {
        currentChapter = headingText;
      }
      continue;
    }

    const articleNumber = normalizeNumberLabel(articleMatch[1]);
    const isRepealed = REPEALED_PATTERN.test(headingText);
    const isEnactmentClause = ENACTMENT_CLAUSE_PATTERN.test(headingText);

    const amendments: FlatViewAmendment[] = [];
    for (const m of headingText.matchAll(AMENDMENT_TAG_PATTERN)) {
      amendments.push({
        verb: VERB_TO_KEY[m[1]],
        instrument: `${m[2]}/${m[3]}`,
      });
    }

    // Content lives in the next sibling element (typically a
    // <div class="text-1">) — fall back to collecting text up to (but not
    // including) the next <h2> if no dedicated sibling div is found, per
    // this module's "under-clean but present" discipline.
    let text = "";
    const next = $el.next();
    if (next.length && next.is("div")) {
      text = next.text().replace(/\s+/g, " ").trim();
    } else {
      let node = next;
      const parts: string[] = [];
      while (node.length && !node.is("h2")) {
        parts.push(node.text());
        node = node.next();
      }
      text = parts.join(" ").replace(/\s+/g, " ").trim();
    }

    const headingPath = [currentBook, currentChapter].filter(Boolean).join(" > ") || null;

    articles.push({
      articleNumber,
      headingPath,
      text,
      amendments,
      isRepealed,
      isEnactmentClause,
    });
  }

  if (articles.length === 0) {
    throw new LegalSourceParseError(
      "No article headings found in flat-view page — page shape may not match the expected LawView.aspx template",
    );
  }

  return articles;
}
